import * as opml from "opml";

function getMonthName(d) {
  return new Date(d).toLocaleString("default", { month: "long" });
}

function bumpDate(theDate) {
  //every node needs a unique created att
  theDate.setSeconds(theDate.getSeconds() + 1);
  return theDate;
}

function getSub(parent, theSub) {
  if (parent.subs === undefined) {
    parent.subs = new Array();
  }
  for (var i = 0; i < parent.subs.length; i++) {
    var item = parent.subs[i];
    if (item.text == theSub.text) {
      //it's already there
      return item;
    }
  }
  if (theSub.subs === undefined) {
    theSub.subs = new Array();
  }
  parent.subs.unshift(theSub);
  return parent.subs[0];
}

const generateTestOutline = () => {
  console.log("generateTestOutline start");
  var year = 2022;
  var month = 4;
  var day = 20;
  var theDate = new Date(0);
  theDate.setFullYear(year);
  theDate.setMonth(month);
  theDate.setDate(day);

  const mdtext = `
# test title
writing a test blog
`;

  var monthname = getMonthName(theDate);

  const outline: OPML = {
    opml: {
      head: {},
      body: {},
    },
  };

  const monthDate = bumpDate(theDate);
  const dayDate = bumpDate(monthDate);
  let subDate = bumpDate(dayDate);
  var theMonth = getSub(outline.opml.body, {
    text: monthname + " " + year,
    type: "calendarMonth",
    created: monthDate.toUTCString(),
    name: monthname.toLowerCase() + year,
  });
  var theDay = getSub(theMonth, {
    text: monthname + " " + Number(day),
    type: "calendarDay",
    created: dayDate.toUTCString(),
    name: day,
  });

  var theDayOutline = opml.markdownToOutline(mdtext, {
    flAddUnderscores: false,
  });
  theDay.subs = theDayOutline.opml.body.subs;
  theDay.subs.forEach(function (item) {
    subDate = bumpDate(subDate);
    item.type = "markdown";
    item.created = subDate.toUTCString();
  });

  console.log("generateTestOutline outline", outline);
  console.log("generateTestOutline theDay", theDay);
  console.log("generateTestOutline end");
};
