package com.kindergarten.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalTime;

@Converter(autoApply = true)
public class LocalTimeStringConverter implements AttributeConverter<LocalTime, String> {
    @Override
    public String convertToDatabaseColumn(LocalTime attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public LocalTime convertToEntityAttribute(String dbData) {
        return dbData == null || dbData.isBlank() ? null : LocalTime.parse(dbData);
    }
}
