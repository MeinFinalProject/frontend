using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Ta.Backend.Common;
using Ta.Backend.Features.AcademicManagement;
using Ta.Backend.Features.Identity;
using Ta.Backend.Tests;

// Dedicated PostgreSQL test schema; never inserts fixtures into the development database.
var root = Path.GetFullPath(Environment.GetEnvironmentVariable("BACKEND_REPOSITORY") ?? "../TA_backend");
var config = new ConfigurationBuilder().AddUserSecrets("ta-backend-development").AddEnvironmentVariables().Build();
var fixture = new BackendFixture();
Process? server = null;
try
{
    await fixture.InitializeAsync();
    var start = new ProcessStartInfo("dotnet") { WorkingDirectory = Path.Combine(root, "src/Ta.Backend"), UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true };
    start.ArgumentList.Add(Path.Combine(root, "src/Ta.Backend/bin/Release/net10.0/Ta.Backend.dll"));
    start.Environment["ASPNETCORE_ENVIRONMENT"] = "Testing";
    start.Environment["ASPNETCORE_URLS"] = "https://localhost:7243";
    start.Environment["ConnectionStrings__Backend"] = fixture.ConnectionString;
    start.Environment["Administration__Token"] = fixture.AdminToken;
    foreach (var name in new[] { "ModelSha256", "WorkerPath", "ArcFaceModelPath", "DetectorModelPath" })
        if (config[$"Biometrics:{name}"] is {} value) start.Environment[$"Biometrics__{name}"] = value;
    start.Environment["Logging__LogLevel__Default"] = "Warning";
    server = Process.Start(start) ?? throw new InvalidOperationException("Could not start backend test host.");
    // Drain without printing request bodies, credentials, or connection strings.
    server.OutputDataReceived += (_, _) => { }; server.ErrorDataReceived += (_, _) => { };
    server.BeginOutputReadLine(); server.BeginErrorReadLine();
    using var client = new HttpClient { BaseAddress = new Uri("https://localhost:7243"), Timeout = TimeSpan.FromSeconds(10) };
    var ready = false;
    for (var attempt = 0; attempt < 100; attempt++)
    {
        if (server.HasExited) throw new InvalidOperationException("Backend test host exited before readiness.");
        try { if ((await client.GetAsync("/health/ready")).IsSuccessStatusCode) { ready = true; break; } } catch (HttpRequestException) { }
        await Task.Delay(200);
    }
    if (!ready) throw new InvalidOperationException("Backend test host did not become ready.");
    client.DefaultRequestHeaders.Authorization = new("Bearer", fixture.AdminToken);
    async Task<JsonElement> Send(string path, object body, string method = "POST")
    {
        using var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), "/api/v1" + path) { Content = JsonContent.Create(body, options: WireJson.Options) });
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException($"Test fixture setup failed at {path}: {(int)response.StatusCode}");
        var text = await response.Content.ReadAsStringAsync(); return text.Length == 0 ? default : JsonDocument.Parse(text).RootElement.Clone();
    }
    var password = "E2e-" + Guid.NewGuid().ToString("N") + "!";
    var program = await Send("/academic/study-programs", new StudyProgram { StudyProgramCode = "E2E-TI", StudyProgramName = "Teknik Informatika · Uji" });
    var programId = program.GetProperty("study_program_id").GetGuid();
    await Send("/admin/accounts", new CreateStaff("admin@e2e.invalid", password, "Administrator Uji", Roles.Administrator, null));
    var lecturer = await Send("/admin/accounts", new CreateStaff("dosen@e2e.invalid", password, "Dosen Uji", Roles.Lecturer, "E2E-D001"));
    var lecturerAccountId = lecturer.GetProperty("account_id").GetGuid();
    var student = await Send("/auth/register", new RegisterStudent("mahasiswa@e2e.invalid", password, "Mahasiswa Uji", "E2E-M001", programId, 2026));
    var studentAccountId = student.GetProperty("account_id").GetGuid();
    await Send($"/admin/accounts/{studentAccountId}/status", new AccountStatus("approved", "Isolated browser fixture"), "PUT");
    await using var db = fixture.OpenDatabase();
    var lecturerRecord = await db.Set<Lecturer>().SingleAsync(l => l.AccountId == lecturerAccountId);
    var studentRecord = await db.Set<Student>().SingleAsync(s => s.AccountId == studentAccountId);
    await Send($"/academic/students/{studentRecord.StudentId}", new StudentAdministration(lecturerRecord.LecturerId), "PUT");
    var now = DateTimeOffset.UtcNow;
    var term = await Send("/academic/terms", new AcademicTerm { AcademicTermName = "Semester Uji Integrasi", AcademicTermStart = DateOnly.FromDateTime(now.AddDays(-30).UtcDateTime), AcademicTermEnd = DateOnly.FromDateTime(now.AddDays(90).UtcDateTime) });
    var termId = term.GetProperty("academic_term_id").GetGuid();
    var course = await Send("/academic/courses", new Course { CourseCode = "E2E-IF101", CourseName = "Rekayasa Perangkat Lunak · Uji", CourseCredits = 3, StudyProgramId = programId });
    var room = await Send("/academic/classrooms", new Classroom { ClassroomCode = "E2E-101", ClassroomName = "Laboratorium Uji" });
    var roomId = room.GetProperty("classroom_id").GetGuid();
    var academicClass = await Send("/academic/classes", new AcademicClass { AcademicClassName = "A · Uji", AcademicTermId = termId, CourseId = course.GetProperty("course_id").GetGuid(), LecturerId = lecturerRecord.LecturerId });
    var classId = academicClass.GetProperty("academic_class_id").GetGuid();
    // Controlled historical fixture allows correction/percentage verification without waiting for a class to end.
    var historical = new TeachingSession { AcademicClassId = classId, LecturerId = lecturerRecord.LecturerId, ClassroomId = roomId, TeachingSessionStart = now.AddHours(-3), TeachingSessionEnd = now.AddHours(-1), TeachingSessionCourseName = "Rekayasa Perangkat Lunak · Uji", TeachingSessionCourseCredits = 3, TeachingSessionRosterFrozen = true };
    db.Add(historical);
    db.Add(new SessionRoster { TeachingSessionId = historical.TeachingSessionId, StudentId = studentRecord.StudentId });
    await db.SaveChangesAsync();
    // Fixtures contain only disposable test accounts; stdout is consumed privately by global setup.
    Console.WriteLine("E2E_READY:" + JsonSerializer.Serialize(new { password, student_id = studentRecord.StudentId, session_id = historical.TeachingSessionId, class_id = classId, term_id = termId, room_id = roomId, program_id = programId }));
    await Console.In.ReadLineAsync();
}
finally
{
    if (server is { HasExited: false }) { server.Kill(entireProcessTree: true); await server.WaitForExitAsync(); }
    server?.Dispose();
    await ((Xunit.IAsyncLifetime)fixture).DisposeAsync();
}
