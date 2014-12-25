$(function(){

  var manifest = chrome.runtime.getManifest();
  $('#version').text(manifest.version);

  var seasons;
  var html = '';
  $.getJSON('data/seasons.json', function(data){
    seasons = data.seasons;
    $.each(seasons, function(year, seasons){
      $.each(seasons, function(season, animes){
        var url = '#animes-' + year + '-' + season;
        var count = animes.length;
        var title = season.replace(/\b[a-z]/g, function(match){
          return match.toUpperCase();
        }) + ' ' + year;
        html = '<a href="' + url + '" class="list-group-item"><span class="badge">' + count + '</span> ' + title + '</a>' + html;
      });
    });
    $('#seasons-list').html(html);
  });

  var storage = {
    get: function(key, fn){
      var keyTimeout = key + '-timeout';
      chrome.storage.local.get(keyTimeout, function(items){
        var expiry = items[keyTimeout];
        if (!expiry || expiry <= Date.now()){
          chrome.storage.local.remove([keyTimeout, key]);
          fn(null);
        } else {
          chrome.storage.local.get(key, function(items){
            fn(items[key] || null);
          });
        }
      });
    },
    set: function(key, data, timeout, fn){
      var obj = {};
      obj[key] = data;
      obj[key + '-timeout'] = Date.now() + (timeout*60*1000); // minutes
      chrome.storage.local.set(obj, fn);
    }
  };

  var renderAnimes = function(results){
    html = '';
    results.forEach(function(result){
      var score = parseFloat(result.score, 10);
      var scoreColor = score == 10 ? 'mad' : score >= 8 ? 'good' : score >= 6 ? 'ok' : '';
      var episodes = parseInt(result.episodes, 10) || '?';
      html += '<li>'
        + '<div class="image"><img src="' + result.image + '" alt=""></div>'
        + '<div class="info">'
          + '<a href="' + result.url + '" target="_blank">' + result.title + '</a>'
          + '<span class="score badge ' + scoreColor + '">' + result.score + '</span>'
          + '<span class="episodes">' + episodes + ' episodes</span>'
          + '<span class="genres">' + result.genres.join(', ') + '</span>'
        + '</div>'
        + '</li>';
    });
    $('#content-blank').remove();
    $('#content-list').addClass('fadeshow').html(html);
    $('#content')[0].scrollTop = 0; // Reset scroll top

    $('#seasons-list').removeClass('busy').find('.loading').removeClass('loading');
    $('#loader').removeClass('loading');
  }

  $(window).on('hashchange', function(){
    var hash = location.hash.slice(1);
    if (!hash) return;

    // Set selected state
    var $selectedSeasonLink = $('a[href="#' + hash + '"]').addClass('active loading');
    $selectedSeasonLink.siblings().removeClass('active loading');
    $('#seasons-list').addClass('busy');
    try {
      $selectedSeasonLink[0].scrollIntoViewIfNeeded();
    } catch(e) {}

    // Set progress loader
    $('#loader').addClass('loading').attr('value', 0);

    // Remove fade show first
    $('#content-list').removeClass('fadeshow');

    // Get data
    storage.get(hash, function(results){
      if (results && results.length){
        renderAnimes(results);
        return;
      }

      var matches = hash.match(/animes\-(\d+)\-(\w+)/i);
      if (matches.length != 3) return;
      var year = matches[1];
      var season = matches[2];
      var animes = seasons[year][season];

      var q = queue(2);
      var totalAnimes = animes.length;
      var tasks = animes.map(function(url, i){
        q.defer(function(done){
          $.ajax({
            url: 'http://myanimelist.net/anime/' + url.replace(/\/$/, '') + '/',
            timeout: 10*1000, // 10 seconds
            success: function(html){
              try {
                html = html.replace(/<img([^>]*)>/g, '<noimg$1>'); // Prevent loading images when jQuery parses the HTML
                var $html = $(html);
                var title = $html.find('#contentWrapper > h1').find('div').remove().end().text();
                var url = $html.find('#content a.horiznav_active:contains(Details)').attr('href');
                var $sidebar = $html.find('#content > table td.borderClass:first');
                var image = $sidebar.find('noimg[align][src^="http://cdn."]:first').attr('src');
                var score = $sidebar.find('span.dark_text:contains("Score:")')[0].nextSibling.textContent.trim();
                var episodes = $sidebar.find('span.dark_text:contains("Episodes:")')[0].nextSibling.textContent.trim();
                var genres = $sidebar.find('span.dark_text:contains("Genres:")').nextAll('a').get().map(function(el){return el.textContent.trim()});

                var xhr = new XMLHttpRequest();
                xhr.open('GET', image, true);
                xhr.responseType = 'blob';
                xhr.onload = function(e) {
                  var blob = this.response;
                  var reader = new FileReader();
                  reader.onload = function(e){
                    var image = e.target.result;
                    var data = {
                      title: title,
                      url: url,
                      image: image,
                      score: score,
                      episodes: episodes,
                      genres: genres
                    };
                    done(null, data);
                  };
                  reader.readAsDataURL(blob);
                };
                xhr.send();

                $('#loader').attr('value', (i+1)/totalAnimes*100);
              } catch(e){
                var self = this;
                setTimeout(function(){
                  $.ajax(self); // retry
                }, 500);
              }
            },
            error: function(xhr, status, e){
                var self = this;
                setTimeout(function(){
                  $.ajax(self); // retry
                }, 500);
            }
          })
        });
      });

      q.awaitAll(function(error, results){
        if (error){
          console.error(error);
          return;
        }
        results.sort(function(a, b){
          var score = parseFloat(b.score, 10) - parseFloat(a.score, 10);
          return (score != 0) ? score : (b.title < a.title);
        });

        renderAnimes(results);
        storage.set(hash, results, 6*60); // Store for 6 hours
      });

    });

  });

});
