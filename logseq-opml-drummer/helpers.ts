import * as daveutils from "daveutils";
import * as request from "request";
import * as opml from "opml";
import { OPML } from "./opml_types";

function getDateString(theDate = new Date()) {
  return new Date(theDate).toUTCString();
}

export function setupOpmlHead(oldOutline: OPML, config) {
  const newOutline = { ...oldOutline };
  const now = new Date();

  var head = {
    title: config.blogTitle,
    description: config.blogDescription,
    dateCreated: getDateString(config.blogWhenCreated),
    dateModified: getDateString(now),
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

function getMonthName(d) {
  return new Date(d).toLocaleString("default", { month: "long" });
}

function buildParamList(paramtable, flPrivate) {
  var s = "";
  if (flPrivate) {
    paramtable.flprivate = "true";
  }
  for (var x in paramtable) {
    if (paramtable[x] !== undefined) {
      //8/4/21 by DW
      if (s.length > 0) {
        s += "&";
      }
      s += x + "=" + encodeURIComponent(paramtable[x]);
    }
  }
  return s;
}

export function httpReadUrl(url, callback) {
  request(url, function (err, response, data) {
    if (!err && response.statusCode == 200) {
      callback(undefined, data.toString());
    } else {
      if (!err) {
        err = {
          message:
            "Can't read the file because there was an error. Code == " +
            response.statusCode +
            ".",
        };
      }
      callback(err);
    }
  });
}
function httpPost(url, data, callback) {
  var theRequest = {
    method: "POST",
    body: data,
    url: url,
  };
  request(theRequest, function (err, response, data) {
    if (err) {
      callback(err);
    } else {
      if (response.statusCode != 200) {
        const message =
          "The request returned a status code of " + response.statusCode + ".";
        callback({ message });
      } else {
        callback(undefined, data);
      }
    }
  });
}

export function serverpost(
  config,
  path,
  params,
  flAuthenticated,
  filedata,
  callback
) {
  var whenstart = new Date();
  if (params === undefined) {
    params = new Object();
  }
  if (flAuthenticated) {
    //1/11/21 by DW
    params.oauth_token = config.oauth_token;
    params.oauth_token_secret = config.oauth_token_secret;
  }
  var url =
    config.urlTwitterServer + path + "?" + buildParamList(params, false);
  httpPost(url, filedata, callback);
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

const addSubToParent = (parent, sub) => {
  if (parent.subs === undefined) {
    parent.subs = new Array();
  }
  for (var i = 0; i < parent.subs.length; i++) {
    var item = parent.subs[i];
    if (item.text == sub.text) {
      //it's already there
      return item;
    }
  }
  if (sub.subs === undefined) {
    sub.subs = new Array();
  }
  parent.subs.unshift(sub);
  return parent;
};

function replace(object, source, target) {
  // grab the content and children (source key) from the object
  // but only the children if the length is greater than 0
  let newObject = (({ content }) => ({ content }))(object);
  if (Array.isArray(object[source]) && object[source].length > 0) {
    newObject[source] = object[source];
  }

  return Object.keys(newObject)
    .map((k) => {
      const v = newObject[k];
      const newK = k === source ? target : k;
      let newV = v;

      if (v && Array.isArray(v)) {
        newV = v.map((item) => {
          return replace(item, source, target);
        });
      } else if (
        v &&
        typeof v === "object" &&
        Object.keys(v).includes(source)
      ) {
        newV = replace(v, "children", "subs");
      }

      return { [newK]: newV };
    })
    .reduce((acc, cur) => ({ ...acc, ...cur }), {});
}

// TODO add type to logseqTree and newTree
const logseqTreeToOutline = (logseqTree): OPML => {
  console.log("---- logseqTreeToOutline start ----");

  const newTree = replace(logseqTree, "children", "subs");

  console.log("newTree", newTree);
  console.log("---- logseqTreeToOutline end ----");
  return {
    opml: {
      head: {},
      body: { ...newTree },
    },
  };
};

// #TODO type for logseqTree
export function addJournalToOutline(
  outline,
  logseqTree,
  journalDate: Date
): OPML {
  console.log("---- addJournalToOutline start ----");
  console.log(`addJournalToOutline journalDate: ${journalDate}`);
  console.log("addJournalToOutline logseqTree", logseqTree);
  console.log("addJournalToOutline startOutline", outline);

  const year = journalDate.getFullYear().toString();
  const monthname = getMonthName(journalDate);
  const day = journalDate.getDate().toString();

  const monthDate = bumpDate(journalDate);
  const dayDate = bumpDate(monthDate);
  let subDate = bumpDate(dayDate);

  let theMonth = addSubToParent(outline.opml.body, {
    text: monthname + " " + year,
    type: "calendarMonth",
    created: monthDate.toUTCString(),
    name: monthname.toLowerCase() + year,
  });

  console.log("addJournalToOutline theMonth", theMonth);

  let theDay = getSub(theMonth, {
    text: monthname + " " + Number(day),
    type: "calendarDay",
    created: dayDate.toUTCString(),
    name: day,
  });

  console.log("addJournalToOutline theDay", theDay);

  let theDayOutline = logseqTreeToOutline(logseqTree);

  console.log("addJournalToOutline theDayOutline", theDayOutline);

  theDay.subs = theDayOutline.opml.body.subs;
  theDay.subs.forEach(function (item) {
    subDate = bumpDate(subDate);
    item.type = "markdown";
    item.created = subDate.toUTCString();
  });

  console.log("addjournalToOutline theDay", theDay);

  const endOutline = {
    ...outline,
    opml: {
      ...outline.opml,
      body: theMonth,
    },
  };

  console.log("addjournalToOutline end outline: ", endOutline);

  console.log("---- addJournalToOutline end ----");

  // #TODO test that this is correctly concatenating the new journal to the existing outline
  return endOutline;
}

// #TODO - journalsFromLogseq should be a logseq type and have a date
export const readJournalsIntoOutline = (journalsFromLogseq) => {
  var theOutline: OPML = {
    opml: {
      head: {},
      body: {},
    },
  };

  for (var journal of journalsFromLogseq) {
    const mdtext = markdownFromJournal(journal);
    theOutline = addJournalToOutline(theOutline, mdtext, journal.date);
  }

  return {
    outline: theOutline,
    err: undefined,
  };
};

const markdownFromJournal = (journal) => {
  const mdtext = `
# ${journal.title}

${journal.text}

`;
  return mdtext;
};
