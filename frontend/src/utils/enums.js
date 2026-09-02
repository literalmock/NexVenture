export const USER_ROLES = Object.freeze({
  FOUNDER: "founder",
  INVESTOR: "investor",
  MENTOR: "mentor",
  STUDENT: "student",
});

export const USER_ROLE_VALUES = Object.freeze(Object.values(USER_ROLES));

export const USER_ROLE_LABELS = Object.freeze({
  [USER_ROLES.FOUNDER]: "Founder",
  [USER_ROLES.INVESTOR]: "Investor",
  [USER_ROLES.MENTOR]: "Mentor",
  [USER_ROLES.STUDENT]: "Student",
});

export const USER_ROLE_BADGES = Object.freeze({
  [USER_ROLES.FOUNDER]: "🚀 Founder",
  [USER_ROLES.INVESTOR]: "💼 Investor",
  [USER_ROLES.MENTOR]: "💡 Mentor",
  [USER_ROLES.STUDENT]: "🎓 Student",
});
