import { registerHandler } from "../registry";
import { heroHandler } from "./hero";
import { requisitesHandler } from "./requisites";
import { announcementsHandler } from "./announcements";
import { boardIntroHandler } from "./board_intro";
import { boardMembersHandler } from "./board_members";
import { homeWidgetsHandler } from "./home_widgets";
import { faqHandler } from "./faq";
import { informationPostsHandler } from "./information_posts";
import { documentsHandler } from "./documents";
import { specialistsHandler } from "./specialists";
import { planHandler } from "./plan";

/**
 * Central content-engine v2 handler registration point.
 *
 * N3 will add the first real handler:
 *   registerHandler(announcementsHandler)
 *
 * N5 will add the remaining migrated handlers one by one.
 */
export function registerAllHandlers() {
  registerHandler(announcementsHandler);
  registerHandler(boardIntroHandler);
  registerHandler(boardMembersHandler);
  registerHandler(documentsHandler);
  registerHandler(faqHandler);
  registerHandler(heroHandler);
  registerHandler(homeWidgetsHandler);
  registerHandler(informationPostsHandler);
  registerHandler(planHandler);
  registerHandler(requisitesHandler);
  registerHandler(specialistsHandler);
}
