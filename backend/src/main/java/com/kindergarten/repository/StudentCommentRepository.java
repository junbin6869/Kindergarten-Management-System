package com.kindergarten.repository;

import com.kindergarten.domain.StudentComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentCommentRepository extends JpaRepository<StudentComment, Long> {
    List<StudentComment> findByStudentIdOrderByCreatedAtDesc(Long studentId);
}
