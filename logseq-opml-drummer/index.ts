import "@logseq/libs";
// import * as daveutils from "daveutils";
import * as helpers from "./helpers";
import * as opml from "opml";

const baseConfig = {
  twScreenName: undefined,

  logSeqJournalFolder: undefined,
  opmlJournalFile: undefined,

  blogTitle: undefined,
  blogDescription: undefined,
  blogWhenCreated: undefined,
  blogTimeZoneOffset: undefined,
  blogCopyright: undefined,
  blogUrlHeaderImage: undefined,
  blogUrlTemplate: undefined,
  blogUrlHomePageTemplate: undefined,
  blogUrlGlossary: undefined,
  blogUrlAboutOpml: undefined,
  blogUrlWebsite: undefined,
  blogUseCache: false,
  urlTwitterServer: "http://drummer.scripting.com/",
  oauth_token: undefined,
  oauth_token_secret: undefined,
};

type OPMLResponse = {
  opmlText: String;
  err: {
    message: String;
  };
};

const saveOpmlFile = async (config: {
  [key: string]: string | number | boolean;
}): Promise<OPMLResponse> => {
  console.log("saveOpmlFile");

  const journalsFromLogseq = await logseq.DB.q("(between -7d +0d)");
  // one query per page. iterate over each date and make query
  // const journalsFromLogseq = await logseq.DB.q("(page [[Apr 17th, 2022]])"); // #TODO get journal data from logseq

  console.log("journalsFromLogseq", journalsFromLogseq);
  // const { err, outline } = helpers.readJournalsIntoOutline(journalsFromLogseq);

  // let opmlText = "";
  // if (err) {
  //   console.log("saveMyLogSeqOpml: err.message == " + err.message);
  // } else {
  //   opmlText = opml.stringify(outline);
  //   if (config.opmlJournalFile !== undefined) {
  //     // #TODO write opml file using logseq file api
  //     // fs.writeFile(config.opmlJournalFile, opmlText, function (err) {
  //     //   if (err) {
  //     //     console.log("saveMyLogSeqOpml: err.message == " + err.message);
  //     //   }
  //     // });
  //   }
  // }

  return {
    opmlText: "opmlText",
    err: { message: "" },
  };
};

/**
 * main entry
 * @param baseInfo
 */
function main() {
  logseq.provideModel({
    async publishBlog() {
      console.log("hello from logseq-opml-drummer");
      console.log(logseq.FileStorage);
      const userConfig = await logseq.App.getUserConfigs();
      const fullConfig = { ...baseConfig, ...userConfig };

      const { err, opmlText } = await saveOpmlFile(fullConfig);
      if (err) {
        console.log("logseqpublish: err.message == " + err.message);
      } else {
        console.log("logseqpublish: opmltext.length == " + opmlText.length);
        const params = {
          relpath: "blog.opml",
          type: "text/xml",
        };

        helpers.serverpost(
          fullConfig,
          "publishfile",
          params,
          true,
          opmlText,
          function (err, data) {
            if (err) {
              console.log("publishfile: err.message == " + err.message);
            } else {
              helpers.httpReadUrl(
                "http://drummercms.scripting.com/build?blog=" +
                  fullConfig.twScreenName,
                function (err, data) {
                  if (err) {
                    console.log("drummerCms: err.message == " + err.message);
                  } else {
                    console.log(data);
                  }
                }
              );
            }
          }
        );
      }
    },
  });

  logseq.App.registerUIItem("toolbar", {
    key: "opml-drummer",
    template: `
      <a data-on-click="publishBlog" class="button">
        <i class="ti ti-rocket"></i>
      </a>
    `,
  });
}

// bootstrap
logseq.ready(main).catch(console.error);
