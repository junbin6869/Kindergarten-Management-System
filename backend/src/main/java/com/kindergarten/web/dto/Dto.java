package com.kindergarten.web.dto;

import com.kindergarten.domain.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.Instant;
import java.util.List;

public final class Dto {
    private Dto() {}

    public record UserDto(Long id, String email, String fullName, Role role) {
        public static UserDto from(AppUser user) {
            return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
        }
    }

    public record ClassDto(Long id, String name, String ageGroup, UserDto teacher) {
        public static ClassDto from(KindergartenClass item) {
            return new ClassDto(
                item.getId(),
                item.getName(),
                item.getAgeGroup(),
                item.getTeacher() == null ? null : UserDto.from(item.getTeacher())
            );
        }
    }

    public record ParentDto(Long id, String fullName, String phone, String email) {
        public static ParentDto from(Parent parent) {
            return new ParentDto(parent.getId(), parent.getFullName(), parent.getPhone(), parent.getEmail());
        }
    }

    public record StudentDto(Long id, String fullName, LocalDate dateOfBirth, StudentStatus status, ClassDto kindergartenClass, Long monthlyAbsences) {
        public static StudentDto from(Student student) {
            return from(student, null);
        }

        public static StudentDto from(Student student, Long monthlyAbsences) {
            return new StudentDto(
                student.getId(),
                student.getFullName(),
                student.getDateOfBirth(),
                student.getStatus(),
                student.getKindergartenClass() == null ? null : ClassDto.from(student.getKindergartenClass()),
                monthlyAbsences
            );
        }
    }

    public record StudentDetailDto(StudentDto student, List<ParentDto> parents, List<AttendanceDto> attendance, List<InvoiceDto> invoices, List<CommentDto> comments) {}

    public record ClassDetailDto(ClassDto classInfo, List<StudentDto> students) {}

    public record AttendanceDto(Long id, Long studentId, LocalDate attendanceDate, AttendanceStatus status, LocalTime checkInTime, String remark) {
        public static AttendanceDto from(AttendanceRecord record) {
            return new AttendanceDto(
                record.getId(),
                record.getStudent().getId(),
                record.getAttendanceDate(),
                record.getStatus(),
                record.getCheckInTime(),
                record.getRemark()
            );
        }
    }

    public record InvoiceDto(Long id, Long studentId, String studentName, YearMonth billingMonth, String billingDetail, BigDecimal amount, LocalDate dueDate, InvoiceStatus status) {
        public static InvoiceDto from(Invoice invoice) {
            return new InvoiceDto(
                invoice.getId(),
                invoice.getStudent().getId(),
                invoice.getStudent().getFullName(),
                invoice.getBillingMonth(),
                invoice.getBillingDetail() == null || invoice.getBillingDetail().isBlank() ? invoice.getBillingMonth().toString() : invoice.getBillingDetail(),
                invoice.getAmount(),
                invoice.getDueDate(),
                invoice.getStatus()
            );
        }
    }

    public record CommentDto(Long id, Long studentId, Long teacherId, String teacherName, String message, Instant createdAt) {
        public static CommentDto from(StudentComment comment) {
            return new CommentDto(
                comment.getId(),
                comment.getStudent().getId(),
                comment.getTeacher().getId(),
                comment.getTeacher().getFullName(),
                comment.getMessage(),
                comment.getCreatedAt()
            );
        }
    }
}
