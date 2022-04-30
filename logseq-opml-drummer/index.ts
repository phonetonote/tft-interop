import "@logseq/libs";
// import * as daveutils from "daveutils";
import * as helpers from "./helpers";
import * as opml from "opml";
import * as dh from "./dateHelpers";
import { OPML } from "./opml_types";
import { LSPluginBaseInfo } from "@logseq/libs/dist/LSPlugin.user";
import { LSPluginFileStorage } from "@logseq/libs/dist/modules/LSPlugin.Storage";
import { serverpost, httpReadUrl } from "./httpHelpers";

const baseConfig = {
  // some defaults
  saveOpmlFile: true,
  opmlJournalFile: "logseq-blog.opml",

  twScreenName: undefined,
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

// #TODO-TS this should probably provide response from writing the file with logseq
type OPMLResponse = {
  opmlText: String;
  err: {
    message: String;
  };
};

const saveOpmlFile = async (
  outline,
  fileStorage: LSPluginFileStorage,
  journalFile
): Promise<OPMLResponse> => {
  const opmlText = opml.stringify(outline);
  const fileName = `${journalFile}`;

  let errorMessage = "";

  try {
    await fileStorage.setItem(fileName, opmlText);
  } catch {
    errorMessage += "Error saving file";
  } finally {
    return {
      opmlText,
      err: {
        message: errorMessage,
      },
    };
  }
};

const opmlFromParentPageName = async (
  parentPageName: string,
  userConfig: { [key: string]: any } = { ...baseConfig }
): Promise<OPML> => {
  // TODO this should be userConfig, not baseConfig
  let outline = helpers.setupOpmlHead(
    {
      opml: {
        head: {},
        body: {},
      },
    },
    userConfig
  );

  //  #TODO optionally only fetch n days back
  //  [?p :block/journal? true]
  //  [?p :block/journal-day ?d]
  //  [(>= ?d 20220401)] [(<= ?d 20220431)]]

  const blogPostRefs = await logseq.DB.datascriptQuery(`
    [:find (pull ?b [*])
      :where
        [?b :block/page ?p]
        [?p :block/journal? true]
        [?b :block/refs ?rp]
        [?rp :block/name "${parentPageName}"]]
  `);

  let currentDate = new Date();

  for (const blogPosts of blogPostRefs) {
    for (const blogPost of blogPosts) {
      const blockWithChildren = await logseq.Editor.getBlock(blogPost.id, {
        includeChildren: true,
      });

      const blogDate = helpers.logseqDateToDate(
        blockWithChildren.page["journalDay"]
      );

      currentDate = dh.bumpDate(blogDate);

      // We are ensured a journalDay attr on page because query includes `:block/journal? true`
      // TODO should this be beginning of month?
      const monthDate = dh.bumpDate(currentDate);

      [outline, currentDate] = helpers.addMonthToOutline(outline, monthDate);
      [outline, currentDate] = helpers.addDayToOutline(outline, currentDate);

      // only needed for blog posts with adjacent outermost blocks
      const sortedChildren = blockWithChildren.children.sort(
        helpers.sortLogseqBlocks
      );

      for (const child of sortedChildren) {
        currentDate = dh.bumpDate(currentDate);

        const [blogPostOutline, newBumpedDate] = helpers.replace(
          child,
          "children",
          "subs",
          currentDate
        );

        currentDate = dh.bumpDate(newBumpedDate);

        let nextBumpedDate;
        [outline, nextBumpedDate] = helpers.addBlogPostOutlineToOutline(
          outline,
          currentDate,
          blogPostOutline
        );

        currentDate = dh.bumpDate(nextBumpedDate);
      }
    }
  }

  return outline;
};

/**
 * main entry
 * @param baseInfo
 */
function main(baseInfo: LSPluginBaseInfo) {
  logseq.provideModel({
    async publishBlog() {
      const userConfig = baseInfo?.settings;
      const fullConfig = { ...baseConfig, ...userConfig };

      console.log("baseConfig", baseConfig);
      console.log("userConfig", userConfig);
      console.log("fullConfig", fullConfig);

      const opmlFromBlocks = await opmlFromParentPageName(
        fullConfig.parentBlogTag,
        fullConfig
      );

      if (fullConfig.saveOpmlFile) {
        const { opmlText, err: opmlResponseErr } = await saveOpmlFile(
          opmlFromBlocks,
          logseq.FileStorage,
          fullConfig.opmlJournalFile
        );

        if (opmlResponseErr.message !== "") {
          console.log("opmlResponse.err.message == " + opmlResponseErr.message);
        } else {
          // TODO unclear if `blog.opml` is supposed to be hard coded, but I think it is
          const params = {
            relpath: "blog.opml",
            type: "text/xml",
          };

          serverpost(
            fullConfig,
            "publishfile",
            params,
            true,
            opmlText,
            function (err, data) {
              if (err) {
                console.log("publishfile: err.message == " + err.message);
              } else {
                httpReadUrl(
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
