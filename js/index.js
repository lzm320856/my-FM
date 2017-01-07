/**
 * Created by zm on 2016/12/7.
 */


function Music() {
     this.songInfo = {
         channel:""
     };
    this.myAudio = myAudio = document.getElementsByTagName("audio")[0];
    this._init();
}
Music.prototype = {
    _init:function () {
        this._bind();
        this._getSong();
        this._getChanels();
        this._choseChanels();

    },
    _bind:function () {
        var that = this;
        setInterval(function(){that._present()},500);
        $("#music .option").on("click",function () {          //控制频道列表是否打开
            var list = $("#music .channels-list");
            if(list.hasClass("channels-none")){
                list.removeClass("channels-none").addClass("channels-show");
            }else{
                list.removeClass("channels-show").addClass("channels-none");
            }
        });

        $(".lrc").on("click",function () {                  //控制歌词按钮开关主界面的碟片/歌词模式
            if($("#music .pictrue").hasClass("none")){
                $(this).removeClass("btn-active");
                $("#music .pictrue").removeClass("none");
                $("#music .lyric").addClass("none");
            }else{
                $(this).addClass("btn-active");
                $("#music .lyric").removeClass("none");
                $("#music .pictrue").addClass("none");
            }
        });
        $(".single").on("click",function () {           //控制单曲循环按钮
            if(that.myAudio.getAttribute("loop")){
                $(this).removeClass("btn-active");
                that.myAudio.removeAttribute("loop");
            }else{
                $(this).addClass("btn-active");
                that.myAudio.setAttribute("loop","loop");
            }
        });
        $("#music .like").on("click",function(){               //控制红心
            $(this).hasClass("active") ? $(this).removeClass("active") : $(this).addClass("active")
        });
        $("#music .play").on("click",function () {              //控制暂停/播放开关
            that._playPause();
        });
        $("#music .next").on("click",function () {              //控制下一曲开关
            that._getSong();
        });
        $(".progress-bar").on("mousedown",function (event) {      //调整进度
            var distance = event.clientX - $(this).offset().left;
            var percentage = distance/$(this).width();
            myAudio.currentTime = myAudio.duration*percentage;
        });
    },

    _getSong:function(){
        var that = this;
        $.ajax({
            url:"http://api.jirengu.com/fm/getSong.php",
            method:"get",
            dataType:"json",
            data:{channel:that.songInfo.channel}
        }).done(function(event){                           //存储歌曲信息
            var ret = event.song[0];
            that.songInfo.sid = ret.sid;
            that.songInfo.title = ret.title;
            that.songInfo.picture = ret.picture;
            that.songInfo.artist =  ret.artist;
            that.songInfo.url = ret.url;
            $("#music .lyric ul").empty();               //清空上一首的歌词
            that._getLyric();                          
            that._loadSong();                            
        }).fail(function () {
            that._getSong();
        });
    },

    _getChanels:function(){                            //获取频道列表
        var that = this;
        $.ajax({
            url: "http://api.jirengu.com/fm/getChannels.php",
            method: "get",
            dataType: "json"
        }).done(function (event) {
            var ret = event.channels;
            ret.forEach(function (e) {
                that._renderChanels(e);
            })
        }).fail(function () {
            $(".channel-list").append("<li>请检查网络连接</li>");
        })
    },
    
    _getLyric:function(){          //获取歌词
        var that = this;
        $.ajax({
            url:"http://api.jirengu.com/fm/getLyric.php",
            method:"get",
            dataType:"json",
            data:{sid:that.songInfo.sid}
        }).done(function (event) {
            that._renderLyric(event.lyric);                    //渲染
        }).fail(function () {
            $(".lyric ul").append("<li>抱歉！此歌没有歌词</li>")
        });
    },


    _renderChanels:function (e) {                             //渲染频道列表
     var channelsItem = "<li channel_id = '" + e.channel_id +"'>" + e.name + "</li>";
     $("#music .channels-list").find("ul").append(channelsItem);
    },

    _choseChanels:function(){
        var that = this;
        $("#music .channels-list").find("ul").on("click",function (e) {
            if(e.target.tagName.toLowerCase() != "li") return;
            that.songInfo.channel = e.target.getAttribute("channel_id");
            that._getSong();
        })
    },
    
    _renderLyric:function(e){
        var that = this;
        var lyric = this._parseLyric(e);
        var item = "";
        lyric.forEach(function (i) {
            item += '<li dataTime ="' + i[0] + '">' + i[1] + '</li>';
        });
        $(".lyric ul").append(item);
        this.myAudio.addEventListener("timeupdate",function () {
            var liH = $(".lyric li").eq(1).outerHeight()-3;             //每行高度
            for(var i=0;i< lyric.length;i++){                          //遍历歌词下所有的li
                var curT = $(".lyric li").eq(i).attr("dataTime");      //获取当前li存入的当前一排歌词时间
                var nexT = $(".lyric li").eq(i+1).attr("dataTime");
                var curTime = that.myAudio.currentTime;
                if ((curTime > curT) && (curT < nexT)){                //当前时间在下一句时间和歌曲当前时间之间的时候 就渲染 并滚动
                    $(".lyric li").removeClass("lyric-active");
                    $(".lyric li").eq(i).addClass("lyric-active");
                    $('.lyric ul').css({
                        'top': -liH*(i-2),
                        "transition":"1s"
                    });
                }
            }
        })
    },

    _parseLyric: function (e) {                     //解析歌词,返回一个二维数组
        var lines = e.split("\n"),
            pattern = /^\[\d{2}\:\d{2}\.\d{2}\]/;
        var lyricArr = [];
        lines.forEach(function (i) {
            if(!pattern.test(i)){              //剔除收到数据中没有时间的部分
                lines.splice(i,1);
                return;
            }
            var time = i.match(pattern);       //把歌词分为：时间和歌词两个部分
            var lyric =i.split(time);
            var seconds = time[0][1]*600+time[0][2]*60+time[0][4]*10+time[0][5]*1;  //将时间换算为秒
            lyricArr.push([seconds,lyric[1]]);      //将整个歌词保存至二维数组中，形式为[时间，歌词]；
        });
        return lyricArr;
    },

    _loadSong: function () {                         //将动态获取的地址，图片添加至正确的位置
        var shareAddress = 'http://service.weibo.com/share/share.php?appkey=&title=我在属于自己的私人FM听：\"' +
                             this.songInfo.title  +'\"，快来欣赏吧！&pic='+ this.songInfo.url + '&searchPic=true&style=simple';
        $("audio").attr("src",this.songInfo.url);
        $("img").attr("src",this.songInfo.picture);
        $(".music-title").html(this.songInfo.title);
        $(".music-artist").html(this.songInfo.artist);
        $(".share").attr("href",shareAddress);
        $("#music").css({
            "background":"url('" + this.songInfo.picture + "') no-repeat center",
            "background-size":"" + $("#music").outerWidth()*5+"px " + $("#music").outerHeight()*5 +"px"
        });
        $(".download").attr("href",this.songInfo.url);
    },

    _playPause: function () {      //切换播放、暂停
        if (this.myAudio.paused){
            this.myAudio.play();
            $(".play").html("&#xe603");
            $("#music img").addClass("rotation");
        }else{
            this.myAudio.pause();
            $(".play").html("&#xe60d");
            $("#music img").removeClass("rotation");
        }
    },

    _present: function(){                //控制进度条
        var length = this.myAudio.currentTime/this.myAudio.duration*100;
        $(".btn-bar").width(length+'%');
        if(length == 100){              //自动切歌
            this._getSong();
        }
    }
};

new Music();












