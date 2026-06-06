package com.kindergarten.repository;

import com.kindergarten.domain.AttendanceRecord;
import com.kindergarten.domain.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByStudentIdOrderByAttendanceDateDesc(Long studentId);
    List<AttendanceRecord> findByStudentKindergartenClassIdAndAttendanceDate(Long classId, LocalDate date);
    Optional<AttendanceRecord> findByStudentIdAndAttendanceDate(Long studentId, LocalDate date);
    long countByStudentIdAndStatusAndAttendanceDateBetween(Long studentId, AttendanceStatus status, LocalDate start, LocalDate end);
}
