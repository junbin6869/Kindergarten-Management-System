package com.kindergarten.security;

import com.kindergarten.domain.AppUser;
import com.kindergarten.domain.Role;

public record AuthUser(Long id, String email, String fullName, Role role) {
    public static AuthUser from(AppUser user) {
        return new AuthUser(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }
}
