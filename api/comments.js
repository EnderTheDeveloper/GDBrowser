const request = require('request')

module.exports = async (app, req, res) => {

    if (app.offline) return res.send("-1")

    let count = +req.query.count || 10
    if (count > 1000) count = 1000

    let params = app.gdParams({
        userID : req.params.id, 
        accountID : req.params.id, 
        levelID: req.params.id,
        page: +req.query.page || 0,
        count,
        mode: req.query.hasOwnProperty("top") ? "1" : "0",
    })

    let path = "getGJComments21"
    if (req.query.type == "commentHistory") path = "getGJCommentHistory"
    else if (req.query.type == "profile") path = "getGJAccountComments20"

    request.post(`${app.endpoint}${path}.php`, {
    form : params}, async function(err, resp, body) { 

      if (err || body == '-1' || !body) return res.send("-1")

      comments = body.split('|')
      comments = comments.map(x => x.split(':'))
      comments = comments.map(x => x.map(x => app.parseResponse(x, "~")))
      if (req.query.type == "profile") comments.filter(x => x[0][2])
      else comments = comments.filter(x => x[1] && x[1][1])
      if (!comments.length) return res.send("-1")

      let pages = body.split('#')[1].split(":")
      let lastPage = +Math.ceil(+pages[0] / +pages[2]);

      let commentArray = []

      comments.forEach((c, i) => {

        var x = c[0] //comment info
        var y = c[1] //account info

        if (!x[2]) return;

        let comment = {}
        comment.content = Buffer.from(x[2], 'base64').toString();
        comment.ID = x[6]
        comment.likes = +x[4]
        comment.date = (x[9] || "?") + app.config.timestampSuffix
        if (comment.content.endsWith("⍟") || comment.content.endsWith("☆")) {
          comment.content = comment.content.slice(0, -1)
          comment.browserColor = true 
        }
        
        if (req.query.type != "profile") {
          comment.username = y[1] || "Unknown"
          comment.levelID = x[1] || req.params.id
          comment.playerID = x[3]
          comment.accountID = y[16]
          comment.form = ['icon', 'ship', 'ball', 'ufo', 'wave', 'robot', 'spider'][Number(y[14])]
          comment.color = (comment.playerID == "16" ? "50,255,255" : x[12] || "255,255,255")
          if (x[10] > 0) comment.percent = +x[10]
          comment.moderator = +x[11] || 0
        }

        if (i == 0 && req.query.type != "commentHistory") {
          comment.results = +pages[0];
          comment.pages = lastPage;
          comment.range = `${+pages[1] + 1} to ${Math.min(+pages[0], +pages[1] + +pages[2])}`
        }

        commentArray.push(comment)

      }) 

      return res.send(commentArray)

      })
}