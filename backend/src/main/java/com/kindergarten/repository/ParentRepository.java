package com.kindergarten.repository;

import com.kindergarten.domain.Parent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParentRepository extends JpaRepository<Parent, Long> {
    List<Parent> findByUserId(Long userId);
}
