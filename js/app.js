var host = "https://br1.api.riotgames.com/";

var key = "RGAPI-291e7346-9dfe-4156-bc98-995914a4a509";
var $username = $("#username");
var $warning = $(".warning");
var $profileImg = $("#profileImg");
var $btnSend = $("#send");
var $sumLvl = $("#sumLvl");
var $info = $("#info");
var champions = [];
var matchQuantity = 5;

var small_size = "20px";
var medium_size = "80px";

var version = "";

(function($) {

    var ajaxQueue = $({});

    $.ajaxQueue = function(ajaxOpts) {
        var oldComplete = ajaxOpts.complete;
        ajaxQueue.queue(function(next) {
            ajaxOpts.complete = function() {
                if (oldComplete) oldComplete.apply(this, arguments);
                next();
            };
            $.ajax(ajaxOpts);
        });
    };
})(jQuery);

function getVersion(callback){
    $.ajax({
        method: "GET",
        url: "http://ddragon.leagueoflegends.com/api/versions.json",
        success: function(versions){
            version = versions[0];
            callback();
        },
        error: function(err){
            console.log("Error in getting API version");
            warn("Ops! Serviço indisponível, tente novamente mais tarde.");
            $btnSend.attr("disabled", "disabled");
            $username.attr("disabled", "disabled");
        }
    });
}

function groupTeamParticipants(participants, identities){

    var team  = [];
    var team1 = [];
    var team2 = [];

    for (var i = 0; i < participants.length; i++) {
        participants[i].identity = identities[i];
        if(participants[i].teamId == 100){
            team1.push(participants[i]);
        } else {
            team2.push(participants[i]);
        }
    }

    team.push(team1);
    team.push(team2);

    return team;
}

function addParticipantInfo(participant, index){
    var html = "";
    html += "<span class='summName'>" + participant[index].identity.player.summonerName + "</span><br>";

    return html;
}

function getUserInfo(username){

    $.ajaxQueue({
        method: "GET",
        url: host + "lol/summoner/v3/summoners/by-name/" + username + "?api_key=" + key,
        success: function(data){

            console.log(data);

            $profileImg.attr("src", "http://ddragon.leagueoflegends.com/cdn/" + version + "/img/profileicon/" + data.profileIconId + ".png");

            $.ajaxQueue({
                method: "GET",
                url: host + "lol/match/v3/matchlists/by-account/" + data.accountId + "?api_key=" + key,
                success: function(res){

                    var info_obj = [];
                    var html = "";
                    var champ_name = "";

                    for (var i = 0; i < matchQuantity; i++) {
                        info_obj.push({
                            "champion" : res.matches[i].champion,
                            "gameId" : res.matches[i].gameId,
                            "lane" : res.matches[i].lane,
                            "role" : res.matches[i].role,
                            "time" : convertTimestamp(res.matches[i].timestamp)
                        })
                    }
                    console.log(res.matches[i]);

                    $.each(info_obj, function(i, el){

                        $.ajaxQueue({
                            method: "GET",
                            url: host + "lol/match/v3/matches/" + el.gameId + "?api_key=" + key + "&champion=" + el.champion,
                            beforeSend: function(jqxhr, settings) {
                                jqxhr._data = settings.url.split("?").pop();
                            },
                            success: function(resp, textStatus, jqXHR){

                                var _data = jqXHR._data.split("&")[1].split("=")[1];
                                var participants = groupTeamParticipants(resp.participants, resp.participantIdentities);

                                console.log(participants);

                                champ_name = getChampionName(_data);

                                // check if team has won or lost
                                var indexHasWon = 0;
                                for (prop in filterObjectProperties(resp.participants, function(e){ return e.championId == _data })) {
                                    indexHasWon = prop;
                                }
                                var hasWon = filterObjectProperties(resp.participants, function(e){
                                    return e.championId == _data
                                })[indexHasWon].stats.win;

                                var hasWonClass = hasWon ? "win" : "lose";

                                var gameDuration = resp.gameDuration;
                                
                                html += "<div class='wrapper'>";
                                html += "<div class='summoner " + hasWonClass + "'>";
                                html += "<div class='summonerImg'>";
                                html +=     getChampionImg(champ_name, medium_size);
                                html += "</div>";
                                html += "</div>";

                                html += "<div class='match'>";

                                html += "<div class='team1'>";
                                for (var n = 0; n < participants[0].length; n++) {
                                    html += getChampionImg(getChampionName(participants[0][n].championId), small_size);
                                    html += addParticipantInfo(participants[0], n);
                                }
                                html += "</div>";

                                html += "<div class='team2'>";
                                for (var n = 0; n < participants[1].length; n++) {
                                    html += getChampionImg(getChampionName(participants[1][n].championId), small_size);
                                    html += addParticipantInfo(participants[1], n);
                                }
                                html += "</div>";
                                
                                html += "</div>";
                                html += "</div>";

                                $info.html(html);
                            }
                        });
                    });                            
                    
                    return info_obj;
                }
            });

            $sumLvl.html(data.summonerLevel);

            // /lol/match/v3/matches/{matchId} 
        },
        error: function(err){
            console.log("error");
            console.log(err);
            if(err.statusText == "Not Found"){
                warn("Ops! Ocorreu um erro: Nome de invocador não encontrado.");
            } else {
                warn("Ops! Ocorreu um erro: " + err.statusText);
            }
            return err;
        }
    });
}

function getChampionName(champ_id){
    champ_name = "";
    for (property in filterObjectProperties(champions, function(e){return e.key == champ_id})){
        champ_name = property;
    }
    return champ_name;
}

function getChampionImg(champ_name, size){
    return "<img src='http://ddragon.leagueoflegends.com/cdn/" + version + "/img/champion/" + champ_name + ".png' width='" + size + "' height='" + size + "' />"
}

function filterObjectProperties(obj, filtercb){
    var ret = {};
    for(var p in obj)
        if(obj.hasOwnProperty(p))
            if(filtercb(obj[p]))
                ret[p] = obj[p];
    return ret;
}

function getChampions(){
    $.ajax({
        method: "GET",
        url: "http://ddragon.leagueoflegends.com/cdn/" + version + "/data/en_US/champion.json",
        success: function(data){
            champions = data.data;
            console.log(champions);
        },
        error: function(){
            console.log("Err: Cannot get champion list!");
            warn("Ops! Ocorreu um erro, tente novamente mais tarde");
        }
    });
}

function convertTimestamp(timestamp){
    var date = new Date(timestamp * 1000);
    var hours = date.getHours();
    var minutes = "0" + date.getMinutes();
    var seconds = "0" + date.getSeconds();

    return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}

function warn(msg){
    $warning.html(msg);
}

$("#send").on("click", function(e){

    e.preventDefault();

    if($username.val().trim() != ""){
        warn("");
        getUserInfo($username.val());
    } else {
        warn("Preencha o campo 'username'");
    }
});

$(document).on("keyup", function(e){
    if(e.which == 13 && $username.is(":focus")){ // ENTER
        $btnSend.click();
    }
});

getVersion(getChampions);