// -----------------------------------------------------------------------------
// モジュールのインポート
const http   = require("http");
const server = require("express")();
const line = require("@line/bot-sdk"); // Messaging APIのSDKをインポート


// -----------------------------------------------------------------------------
// パラメータ設定
const line_config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN, // 環境変数からアクセストークンをセットしています
    channelSecret: process.env.LINE_CHANNEL_SECRET // 環境変数からChannel Secretをセットしています
};

const url = 'http://weather.livedoor.com/forecast/webservice/json/v1?city=130010';

// -----------------------------------------------------------------------------
// Webサーバー設定
server.listen(process.env.PORT || 3000);

// APIコールのためのクライアントインスタンスを作成
const bot = new line.Client(line_config);

// -----------------------------------------------------------------------------
// ルーター設定
server.post('/webhook', line.middleware(line_config), (req, res, next) => {
    // 先行してLINE側にステータスコード200でレスポンスする。
    res.sendStatus(200);

    // すべてのイベント処理のプロミスを格納する配列。
    let events_processed = [];
    var msg = '';

    // イベントオブジェクトを順次処理。
    req.body.events.forEach((event) => {
        // この処理の対象をイベントタイプがメッセージで、かつ、テキストタイプだった場合に限定。
        if (event.type == "message" && event.message.type == "text"){
            // ユーザーからのテキストメッセージが「こんにちは」だった場合のみ反応。
            if (event.message.text == "hello"){
                // http request
                events_processed.push(http.get(url, (weather_res) => {
                    var body = '';
                    weather_res.setEncoding('utf8');
                    weather_res.on('data', (chunk) => {
                        body += chunk
                    });
                    weather_res.on('end', (weather_res) => {
                        weather_res = JSON.parse(body);
                        var city = weather_res.location.city;
                        var date = weather_res.forecasts[0].dateLabel;
                        var weather = weather_res.forecasts[0].telop
                        msg = city + "の" + date + 'のお天気は' + weather + 'です';

                        // 気温もわかる場合
                        if (weather_res.forecasts[0].temperature.max) {
                            max_temperature = weather_res.forecasts[0].temperature.max.celsius;
                            min_temperature = weather_res.forecasts[0].temperature.min.celsius;
                            msg += "\n";
                            msg += "最高気温は" + max_temperature + "度で";
                            msg += "最低気温は" + min_temperature + "度です";
                        }

                        console.log(msg);
                    })
                }));

               // replyMessage()で返信し、そのプロミスをevents_processedに追加。
              events_processed.push(bot.replyMessage(event.replyToken, {
                type: "text",
                text: "hello"
              }));
            }
        }
    });

    // すべてのイベント処理が終了したら何個のイベントが処理されたか出力。
    Promise.all(events_processed).then(
        (response) => {
            console.log(`${response.length} event(s) processed.`);
        }
    );
});

