# Roles API (Postman)

Base URL: {{baseUrl}}
Auth: Authorization: Bearer {{token}}

## List roles
GET {{baseUrl}}/workforce/roles?businessId={{businessId}}

## Role catalog (predefined roles + permissions)
GET {{baseUrl}}/workforce/roles/catalog?businessId={{businessId}}

## Create custom role
POST {{baseUrl}}/workforce/roles
Content-Type: application/json

{
  "businessId": "{{businessId}}",
  "name": "HR / Recruiter",
  "permissions": {
    "people_management": {
      "manage_team_members": true,
      "view_employee_profiles": true
    }
  },
  "isPredefined": false
}

## Create predefined role
POST {{baseUrl}}/workforce/roles/predefined
Content-Type: application/json

{
  "businessId": "{{businessId}}",
  "role": "HR / Recruiter"
}

Accepted role values (case-insensitive, label or code):
- OWNER
- MANAGER
- EMPLOYEE
- HR_RECRUITER ("HR / Recruiter")
- SHIFT_SUPERVISOR ("Shift Supervisor")
- AUDITOR
- TRAINER

## Get role details
GET {{baseUrl}}/workforce/roles/{{roleId}}

## Update role
PUT {{baseUrl}}/workforce/roles/{{roleId}}
Content-Type: application/json

{
  "name": "Shift Supervisor",
  "permissions": {
    "shift_schedule": {
      "view_schedule": true,
      "edit_schedule": true
    }
  }
}

## Delete role
DELETE {{baseUrl}}/workforce/roles/{{roleId}}

## Assign role to user
POST {{baseUrl}}/workforce/roles/assign
Content-Type: application/json

{
  "businessId": "{{businessId}}",
  "userId": "{{userId}}",
  "roleId": "{{roleId}}"
}

## Notes
- Only the business owner can use these endpoints.
- Predefined roles default to employee-level permissions; update permissions after creation if needed.
## Update role permissions
PUT {{baseUrl}}/workforce/roles/{{roleId}}/permissions
Content-Type: application/json

{
  "permissions": {
    "business_overview": {
      "view_business_overview": true,
      "edit_business_overview": true
    }
  }
}