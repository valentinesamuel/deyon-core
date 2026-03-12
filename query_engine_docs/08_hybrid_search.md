# Hybrid Search Strategy

Supports FTS and Trigram search per column.

Example:

search[doctor.name][fts]=john
search[notes][tri]=fever

Execution Strategy:

FTS

to_tsvector('english', doctor.name)
@@
plainto_tsquery('john')

Trigram

doctor.name % 'john'

Indexes:

FTS Index
CREATE INDEX idx_doctor_name_fts
ON doctors
USING GIN(to_tsvector('english', name));

Trigram Index
CREATE INDEX idx_notes_trgm
ON appointments
USING GIN(notes gin_trgm_ops);