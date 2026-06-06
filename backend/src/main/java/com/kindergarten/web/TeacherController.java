package com.kindergarten.web;

import com.kindergarten.domain.AttendanceRecord;
import com.kindergarten.domain.AttendanceStatus;
import com.kindergarten.domain.StudentComment;
import com.kindergarten.repository.*;
import com.kindergarten.web.dto.Dto.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/teacher")
public class TeacherController {
    private final ClassRepository classes;
    private final StudentRepository students;
    private final AttendanceRepository attendance;
    private final InvoiceRepository invoices;
    private final StudentCommentRepository comments;
    private final AppUserRepository users;

    public TeacherController(ClassRepository classes, StudentRepository students, AttendanceRepository attendance,
                             InvoiceRepository invoices, StudentCommentRepository comments, AppUserRepository users) {
        this.classes = classes;
        this.students = students;
        this.attendance = attendance;
        this.invoices = invoices;
        this.comments = comments;
        this.users = users;
    }

    @GetMapping("/classes")
    public List<ClassDto> myClasses(Authentication authentication) {
        Long teacherId = CurrentUser.from(authentication).id();
        return classes.findByTeacherId(teacherId).stream().map(ClassDto::from).toList();
    }

    @GetMapping("/classes/{classId}/students")
    public List<StudentDto> myStudents(@PathVariable Long classId, Authentication authentication) {
        assertTeacherOwnsClass(classId, authentication);
        return students.findByKindergartenClassId(classId).stream().map(StudentDto::from).toList();
    }

    @GetMapping("/classes/{classId}/attendance")
    public List<AttendanceDto> classAttendance(@PathVariable Long classId, @RequestParam LocalDate date, Authentication authentication) {
        assertTeacherOwnsClass(classId, authentication);
        return attendance.findByStudentKindergartenClassIdAndAttendanceDate(classId, date).stream().map(AttendanceDto::from).toList();
    }

    @GetMapping("/students/{studentId}")
    public StudentDetailDto student(@PathVariable Long studentId, Authentication authentication) {
        var student = students.findById(studentId).orElseThrow();
        assertTeacherOwnsClass(student.getKindergartenClass().getId(), authentication);
        return new StudentDetailDto(
            StudentDto.from(student),
            student.getParents().stream().map(ParentDto::from).toList(),
            attendance.findByStudentIdOrderByAttendanceDateDesc(studentId).stream().map(AttendanceDto::from).toList(),
            invoices.findByStudentIdOrderByBillingMonthDesc(studentId).stream().map(InvoiceDto::from).toList(),
            comments.findByStudentIdOrderByCreatedAtDesc(studentId).stream().map(CommentDto::from).toList()
        );
    }

    @PostMapping("/students/{studentId}/comments")
    public CommentDto addComment(@PathVariable Long studentId, @Valid @RequestBody CommentRequest request, Authentication authentication) {
        var student = students.findById(studentId).orElseThrow();
        assertTeacherOwnsClass(student.getKindergartenClass().getId(), authentication);
        StudentComment comment = new StudentComment();
        comment.setStudent(student);
        comment.setTeacher(users.findById(CurrentUser.from(authentication).id()).orElseThrow());
        comment.setMessage(request.message());
        return CommentDto.from(comments.save(comment));
    }

    @PostMapping("/attendance")
    public AttendanceDto markAttendance(@RequestBody AttendanceRequest request, Authentication authentication) {
        var student = students.findById(request.studentId()).orElseThrow();
        assertTeacherOwnsClass(student.getKindergartenClass().getId(), authentication);
        AttendanceRecord record = attendance.findByStudentIdAndAttendanceDate(request.studentId(), request.attendanceDate()).orElseGet(AttendanceRecord::new);
        record.setStudent(student);
        record.setAttendanceDate(request.attendanceDate());
        record.setStatus(request.status());
        record.setCheckInTime(request.checkInTime());
        record.setRemark(request.remark());
        return AttendanceDto.from(attendance.save(record));
    }

    private void assertTeacherOwnsClass(Long classId, Authentication authentication) {
        Long teacherId = CurrentUser.from(authentication).id();
        boolean owns = classes.findByTeacherId(teacherId).stream().anyMatch(item -> item.getId().equals(classId));
        if (!owns) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Class is not assigned to this teacher");
        }
    }

    public record AttendanceRequest(@NotNull Long studentId, @NotNull LocalDate attendanceDate, @NotNull AttendanceStatus status, LocalTime checkInTime, String remark) {}
    public record CommentRequest(@NotBlank String message) {}
}
