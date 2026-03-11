# Join Planner Algorithm

Goal: automatically discover joins based on relation paths.

Example:

doctor.department.hospital.country

Steps:

1. Parse field path
2. Split path into segments
3. Resolve relation metadata from ORM
4. Construct join chain
5. Deduplicate joins
6. Assign table aliases

Example Join Graph:

appointments
 -> doctor
 -> department
 -> hospital
 -> country