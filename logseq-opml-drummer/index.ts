import "@logseq/libs";
// import * as daveutils from "daveutils";
import * as helpers from "./helpers";
import * as opml from "opml";
import { OPML } from "./opml_types";
import { LSPluginBaseInfo } from "@logseq/libs/dist/LSPlugin.user";

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

  // TODO optionally only fetch n days back
  //  [?p :block/journal? true]
  //  [?p :block/journal-day ?d]
  //  [(>= ?d 20220401)] [(<= ?d 20220431)]]

  const blogPosts = await logseq.DB.datascriptQuery(`
    [:find (pull ?b [*])
      :where
        [?b :block/page ?p]
        [?p :block/journal? true]
        [?b :block/refs ?rp]
        [?rp :block/name "myblog"]]
  `);

  console.log("blogPosts query result", blogPosts);

  for (const blogPostsOnEachPage of blogPosts) {
    for (const blogPost of blogPostsOnEachPage) {
      const { id: blogParentId } = blogPost;
      const blockWithChildren = await logseq.Editor.getBlock(blogParentId, {
        includeChildren: true,
      });

      console.log("blockWithChildren", blockWithChildren);
      // 🔖 BOOKMARK
      // create add block to opml outline

      // outline = helpers.addJournalToOutline(outline, logseqTree, journalDate);
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
      console.log("hello from logseq-opml-drummer");
      console.log(logseq.FileStorage);
      const userConfig = baseInfo?.settings;
      console.log("userConfig", userConfig);
      const fullConfig = { ...baseConfig, ...userConfig };
      console.log("fullConfig", fullConfig);

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
