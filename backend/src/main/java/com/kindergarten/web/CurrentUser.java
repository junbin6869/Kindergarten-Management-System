package com.kindergarten.web;

import com.kindergarten.security.AuthUser;
import org.springframework.security.core.Authentication;

public final class CurrentUser {
    private CurrentUser() {}

    public static AuthUser from(Authentication authentication) {
        return (AuthUser) authentication.getPrincipal();
    }
}
