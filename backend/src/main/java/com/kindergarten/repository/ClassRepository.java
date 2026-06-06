package com.kindergarten.repository;

import com.kindergarten.domain.KindergartenClass;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClassRepository extends JpaRepository<KindergartenClass, Long> {
    List<KindergartenClass> findByTeacherId(Long teacherId);
}
