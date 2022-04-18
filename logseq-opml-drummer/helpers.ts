import * as daveutils from "daveutils";
import * as request from "request";
import * as opml from "opml";

function getDateString(theDate = new Date()) {
  return new Date(theDate).toUTCString();
}

function setupOpmlHead(oldOutline, config) {
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

function addJournalToOutline(outline, mdtext: string, journalDate: Date): OPML {
  const year = journalDate.getFullYear();
  const monthname = getMonthName(journalDate);
  const day = journalDate.getDate();

  const monthDate = bumpDate(journalDate);
  const dayDate = bumpDate(monthDate);
  let subDate = bumpDate(dayDate);

  let theMonth = getSub(outline.opml.body, {
    text: monthname + " " + year,
    type: "calendarMonth",
    created: monthDate.toUTCString(),
    name: monthname.toLowerCase() + year,
  });

  let theDay = getSub(theMonth, {
    text: monthname + " " + Number(day),
    type: "calendarDay",
    created: dayDate.toUTCString(),
    name: day,
  });

  let theDayOutline = opml.markdownToOutline(mdtext, {
    flAddUnderscores: false,
  });

  theDay.subs = theDayOutline.opml.body.subs;
  theDay.subs.forEach(function (item) {
    subDate = bumpDate(subDate);
    item.type = "markdown";
    item.created = subDate.toUTCString();
  });

  // #TODO test that this is correctly concatenating the new journal to the existing outline
  return {
    ...outline,
    opml: {
      ...outline.opml,
      body: theMonth,
    },
  };
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
