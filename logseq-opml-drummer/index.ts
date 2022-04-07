import "@logseq/libs";

/**
 * main entry
 * @param baseInfo
 */
function main() {
  console.log("hello from logseq-opml-drummer");
  console.log(logseq.FileStorage);
}

// bootstrap
logseq.ready(main).catch(console.error);
