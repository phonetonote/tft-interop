# logseq-opml-drummer

a logseq plugin to blog straight from logseq.

based on [myLogseqBlog](https://github.com/scripting/myLogseqBlog)

## config

sample config to put into logseq package config

```
{
  "twScreenName": "phonetonote",
  "blogTitle": "ptn interop blog",
  "blogDescription": "publishing thoughts about tft interop from inside logseq",
  "blogWhenCreated": "2022-04-17",
  "blogTimeZoneOffset": -5,
  "blogCopyright": "copyright 2022, phonetonote publishing",
  "blogUrlHeaderImage": "https://phonetonote.com/images/katz-bg.jpg",
  "oauth_token": "TODO_MAKE_DRUMMER_OAUTH_TOKEN",
  "oauth_token_secret": "TODO_MAKE_DRUMMER_OAUTH_TOKEN_SECRET",
  "disabled": false,
  "parentBlogTag":  "myblog",
  "saveOpmlFile": true
}
```

note this currently requires a `parentBlogTag` to which to pull blog posts from. later versions might support not having a tag and pulling in all blocks from journal pages.

please see the [drummer readme](https://github.com/scripting/myLogseqBlog/blob/main/README.md) for directions on getting your oauth token and secret out of drummer to put into your config above.
