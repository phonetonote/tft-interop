import "@logseq/libs";
// import * as daveutils from "daveutils";
import * as helpers from "./helpers";
import * as opml from "opml";
import { OPML } from "./opml_types";

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
  parentBlogTag: "myBlog",
};

// TODO this should probably provide response from writing the file with logseq
type OPMLResponse = {
  opmlText: String;
  err: {
    message: String;
  };
};

const saveOpmlFile = async (outline): Promise<OPMLResponse> => {
  console.log("saveOpmlFile");
  const opmlText = opml.stringify(outline);
  // #TODO write opml file using logseq file api
  // fs.writeFile(config.opmlJournalFile, opmlText, function (err) {
  //   if (err) {
  //     console.log("saveMyLogSeqOpml: err.message == " + err.message);
  //   }
  // });

  return {
    opmlText: opmlText,
    err: { message: "" },
  };
};

const opmlFromParentPageName = async (
  parentPageName: string
): Promise<OPML> => {
  let outline = helpers.setupOpmlHead(
    {
      opml: {
        head: {},
        body: {},
      },
    },
    baseConfig
  );

  const blogPosts = await logseq.DB.q(
    `(and [[${parentPageName}]] (between -7d +0d))`
  );

  for (const blogPost of blogPosts) {
    // TODO this isn't how the data actually is
    const { logseqTree, journalDate } = blogPost;
    outline = helpers.addJournalToOutline(outline, logseqTree, journalDate);
  }

  return outline;
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

      const opmlFromBlocks = opmlFromParentPageName(fullConfig.parentBlogTag);
      if (fullConfig.opmlJournalFile !== undefined) {
        const { opmlText, err: opmlResponseErr } = await saveOpmlFile(
          opmlFromBlocks
        );
        if (opmlResponseErr.message !== "") {
          console.log("opmlResponse.err.message == " + opmlResponseErr.message);
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
