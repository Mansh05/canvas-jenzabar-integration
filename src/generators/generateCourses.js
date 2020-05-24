import { DateTime } from 'luxon';
import jsonToCSV from '../utils/jsonToCSV';
import jex from '../services/jex';
import canvas from '../services/canvas';

const onlyParentCourses = course => course.courseCode === course.parentCourseCode;

const noCoursesTwoWeeksAfterStartDate = ({ today }) => course => {
  const startDate = DateTime.fromISO(course.startDate);
  const twoWeeksAfterStartDate = startDate.plus({ weeks: 2 });
  const now = today ? DateTime.fromISO(today) : DateTime.local();
  return now < twoWeeksAfterStartDate;
};

const byStartDate = (course1, course2) => {
  const start1 = DateTime.fromISO(course1.startDate);
  const start2 = DateTime.fromISO(course2.startDate);
  return start1 <= start2 ? -1 : 1;
};

const toCanvasCsvFormat = ({ blueprintCourseId }) => course => {
  const canvasCsvCourse = {
    course_id: course.id,
    short_name: course.id,
    long_name: course.name,
    term_id: `${course.year}-${course.term}`,
    status: 'active',
    start_date: course.openDate,
    end_date: course.closeDate,
  };

  if (!blueprintCourseId) return canvasCsvCourse;

  return { ...canvasCsvCourse, blueprint_course_id: blueprintCourseId };
};

/**
 * @param today - pretend like this is today's date
 */
export default async ({ today = null, blueprintCourseId = 'TEMPLATE-ENHANCEDCOURSE' } = {}) => {
  const [coursesFromJex, coursesFromCanvas] = await Promise.all([
    jex.getActiveCourses(),
    canvas.getCourses(),
  ]);

  const canvasSisCourseIds = coursesFromCanvas.map(c => c.sis_course_id);
  const canvasCourseIdSet = new Set(canvasSisCourseIds);

  const canvasCsvCourses = coursesFromJex
    .filter(noCoursesTwoWeeksAfterStartDate({ today }))
    // only parent courses should have a course shell
    .filter(onlyParentCourses)
    // online courses that don't yet exist in canvas
    .filter(jexCourse => !canvasCourseIdSet.has(jexCourse.id))
    .sort(byStartDate)
    .map(toCanvasCsvFormat({ blueprintCourseId }));

  const csv = jsonToCSV(canvasCsvCourses);
  return csv;
};
