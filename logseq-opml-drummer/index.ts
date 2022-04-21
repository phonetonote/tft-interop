import "@logseq/libs";
// import * as daveutils from "daveutils";
import * as helpers from "./helpers";
import * as opml from "opml";
import * as dh from "./dateHelpers";
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

// #TODO-TS this should probably provide response from writing the file with logseq
type OPMLResponse = {
  opmlText: String;
  err: {
    message: String;
  };
};

const saveOpmlFile = async (outline): Promise<OPMLResponse> => {
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

  for (const blogPosts of blogPostRefs) {
    for (const blogPost of blogPosts) {
      const blockWithChildren = await logseq.Editor.getBlock(blogPost.id, {
        includeChildren: true,
      });

      // We are ensured a journalDay attr on page because query includes `:block/journal? true`
      const monthDate = dh.bumpDate(
        helpers.logseqDateToDate(blockWithChildren.page["journalDay"])
      );
      const dayDate = dh.bumpDate(monthDate);
      outline = helpers.addMonthToOutline(outline, monthDate);
      outline = helpers.addDayToOutline(outline, dayDate);

      // only needed for blog posts with adjacent outermost blocks
      const sortedChildren = blockWithChildren.children.sort(
        helpers.sortLogseqBlocks
      );

      for (const child of sortedChildren) {
        const blogPostOutline = helpers.replace(child, "children", "subs");

        outline = helpers.addBlogPostOutlineToOutline(
          outline,
          dayDate,
          blogPostOutline
        );
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

      console.log("fullConfig", fullConfig);

      const opmlFromBlocks = await opmlFromParentPageName(
        fullConfig.parentBlogTag
      );
      console.log(opmlFromBlocks);
      // if (fullConfig.opmlJournalFile !== undefined) {
      //   const { opmlText, err: opmlResponseErr } = await saveOpmlFile(
      //     opmlFromBlocks
      //   );
      //   if (opmlResponseErr.message !== "") {
      //     console.log("opmlResponse.err.message == " + opmlResponseErr.message);
      //   } else {
      //     console.log("logseqpublish: opmltext.length == " + opmlText.length);
      //     const params = {
      //       relpath: "blog.opml",
      //       type: "text/xml",
      //     };

      //     helpers.serverpost(
      //       fullConfig,
      //       "publishfile",
      //       params,
      //       true,
      //       opmlText,
      //       function (err, data) {
      //         if (err) {
      //           console.log("publishfile: err.message == " + err.message);
      //         } else {
      //           helpers.httpReadUrl(
      //             "http://drummercms.scripting.com/build?blog=" +
      //               fullConfig.twScreenName,
      //             function (err, data) {
      //               if (err) {
      //                 console.log("drummerCms: err.message == " + err.message);
      //               } else {
      //                 console.log(data);
      //               }
      //             }
      //           );
      //         }
      //       }
      //     );
      //   }
      // }
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
