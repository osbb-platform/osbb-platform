// Canonical limit for house_information_posts.body. Used by create/edit UI
// (input maxLength + character counters), template application, and the
// content-engine v2 create/update command validators — keep all of those in
// sync by importing this constant rather than repeating the literal number.
export const INFORMATION_BODY_MAX_LENGTH = 1024;
