import { OPML } from "./opml_types";
import * as dh from "./dateHelpers";

// this should sort the adjacent blocks correctly
// but could break if the first block's left block was created after the
// other blocks. Sorting backwards because we `unshift` them into the array.
export const sortLogseqBlocks = (a, b) => {
  return (b["left"]["id"] ?? 0) - (a["left"]["id"] ?? 0);
};

// YYYYMMDD as a string to js date
export const logseqDateToDate = (logseqDate: number) => {
  const dateStr = logseqDate.toString();
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));
  const newDate = new Date(year, month - 1, day);

  return newDate;
};

// TODO-TS config should have a type
export function setupOpmlHead(oldOutline: OPML, config) {
  const newOutline = { ...oldOutline };
  const now = new Date();

  var head = {
    title: config.blogTitle,
    description: config.blogDescription,
    dateCreated: dh.getDateString(config.blogWhenCreated),
    dateModified: dh.getDateString(now),
    timeZoneOffset: config.blogTimeZoneOffset,
    copyright: config.blogCopyright,
    urlHeaderImage: config.blogUrlHeaderImage,
    urlTemplate: config.blogUrlTemplate,
    urlHomePageTemplate: config.blogUrlHomePageTemplate,
    urlGlossary: config.blogUrlGlossary,
    urlAboutOpml: config.blogUrlAboutOpml,
    urlBlogWebsite: config.blogUrlWebsite,
    flOldSchoolUseCache: config.blogUseCache,
  };
  for (var x in head) {
    if (head[x] !== undefined) {
      newOutline.opml.head[x] = head[x];
    }
  }

  return newOutline;
}

export const addMonthToOutline = (
  outline: OPML,
  monthlyDate: Date
): [OPML, Date] => {
  let newOutline = { ...outline };

  if (newOutline.opml.body.subs === undefined) {
    newOutline.opml.body.subs = [];
  }

  const yearlyMonthName = dh.yearlyMonthStringFromDate(monthlyDate);

  for (let i = 0; i < newOutline.opml.body.subs.length; i++) {
    const sub = newOutline.opml.body.subs[i];

    if (sub.text === yearlyMonthName) {
      return [newOutline, dh.bumpDate(monthlyDate)];
    }
  }

  const monthSub = {
    text: yearlyMonthName,
    type: "calendarMonth",
    created: monthlyDate.toUTCString(),
    name: dh.yearlyMonthStringFromDate(monthlyDate, true),
    subs: [],
  };

  newOutline.opml.body.subs.unshift(monthSub);

  return [newOutline, dh.bumpDate(monthlyDate)];
};

export const addDayToOutline = (outline: OPML, dayDate: Date): [OPML, Date] => {
  let newOutline = { ...outline };
  const monthKey = dh.yearlyMonthStringFromDate(dayDate);
  let monthSub = newOutline.opml.body.subs.filter(
    (sub) => sub.text === monthKey
  )[0];

  if (monthSub === undefined) {
    throw `Can't find month ${monthKey} in outline`;
  }

  const dayDateDayString = `${dayDate.getDate()}`;
  const daySubText = `${dh.getMonthName(dayDate)} ${dayDateDayString}`;

  for (let i = 0; i < monthSub.subs.length; i++) {
    const sub = monthSub.subs[i];

    if (sub.text === daySubText) {
      return [newOutline, dh.bumpDate(dayDate)];
    }
  }

  const daySub = {
    text: daySubText,
    type: "calendarDay",
    created: dayDate.toUTCString(),
    name: dayDateDayString,
    subs: [],
  };

  monthSub.subs.unshift(daySub);

  return [newOutline, dh.bumpDate(dayDate)];
};

// TODO-TS blogPostOutline is a type that is not OPML, it's just the text and subs
// the type is a LogSeq BlockEntity but with `children` replaced with `sub`
export const addBlogPostOutlineToOutline = (
  outline: OPML,
  blogDate: Date,
  blogPostOutline
): [OPML, Date] => {
  const newOutline = { ...outline };
  const monthSubText = dh.yearlyMonthStringFromDate(blogDate);
  const dayDateDayString = `${blogDate.getDate()}`;
  const daySubText = `${dh.getMonthName(blogDate)} ${dayDateDayString}`;

  const monthSub = newOutline.opml.body.subs.filter(
    (sub) => sub.text === monthSubText
  )[0];
  const daySub = monthSub.subs.filter((sub) => sub.text === daySubText)[0];

  if (daySub === undefined) {
    throw `Can't find day ${daySubText} in outline`;
  }

  daySub.subs.unshift(blogPostOutline);

  let subDate = blogDate;
  daySub.subs.forEach(function (item) {
    subDate = dh.bumpDate(subDate);
    item.type = "markdown";
    item.created = subDate.toUTCString();
  });
  return [newOutline, subDate];
};

export const replace = (object, source, target, blogDate): [any, Date] => {
  // grab the content and children (source key) from the object
  // but only the children if the length is greater than 0
  let newObject = (({ content }) => ({ content }))(object);
  if (Array.isArray(object[source]) && object[source].length > 0) {
    newObject[source] = object[source];
  }

  const bumpedDate = dh.bumpDate(blogDate);

  return [
    Object.keys(newObject)
      .map((k) => {
        const v = newObject[k];
        const newK = k === source ? target : k;
        let newV = v;
        let newDateToBump = new Date();

        if (v && Array.isArray(v)) {
          [[newV, newDateToBump]] = v.map((item) => {
            return replace(item, source, target, bumpedDate);
          });
        } else if (
          v &&
          typeof v === "object" &&
          Object.keys(v).includes(source)
        ) {
          [newV, newDateToBump] = replace(v, source, target, bumpedDate);
        }

        return {
          [newK]: newV,
          type: "markdown",
          created: newDateToBump.toUTCString(),
        };
      })
      .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
    bumpedDate,
  ];
};
