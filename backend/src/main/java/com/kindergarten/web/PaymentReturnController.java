package com.kindergarten.web;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/return")
public class PaymentReturnController {
    @GetMapping(value = "/{result}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> paymentReturn(@PathVariable String result) {
        boolean success = "success".equalsIgnoreCase(result);
        String title = success ? "Payment completed" : "Payment cancelled";
        String message = success
            ? "Your payment was submitted. Return to the app to view the updated fee status."
            : "No payment was made. Return to the app when you are ready.";
        String deepLink = "kindergarten-mobile://payments/" + (success ? "success" : "cancel");
        String html = """
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <title>%s</title>
              <style>
                body { font-family: sans-serif; background: #fff7ed; color: #3b2618; padding: 32px; }
                main { max-width: 480px; margin: 15vh auto; background: #fffaf3; border: 1px solid #f2d8bf; border-radius: 12px; padding: 24px; }
                a { display: inline-block; margin-top: 16px; background: #f97316; color: white; padding: 12px 16px; border-radius: 8px; text-decoration: none; font-weight: bold; }
              </style>
            </head>
            <body>
              <main><h1>%s</h1><p>%s</p><a href="%s">Return to app</a></main>
              <script>window.location.href = "%s";</script>
            </body>
            </html>
            """.formatted(title, title, message, deepLink, deepLink);
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }
}
