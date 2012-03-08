(function() {
	
	// Keep in global namespace for background page.
	window.Watched = {
	
		init: function(){
			this.name = "Watched";
			this.filter = new Filter(this.name);
		},
		
		bind: {},
		
		display: {
			
			/**
			 * Append
			 * 
			 * @param repos Watched repositories to append to display.
			 */
			append: function(contextId, repos) {
				
				var list = jQuery('.watched_list');
				
				// If a list has not yet been created.
				if(list.length == 0) {
					App.content.post(contextId, Watched.name, function() {
						repos = Watched.filter.apply.recentlyPushed(repos);
						App.content.display(Watched.html.list(repos));
					});
				}
				
				// Append the list.
				else {
					App.content.post(contextId, Watched.name, function() {
						for(var i in repos) {
							var repo = repos[i];
						
							var old = list.find('li.repo[id="' + repo.id + '"]');
							var temp = list.find('li.repo:first-child');
							var html = Watched.html.item(repo);
						
							while(temp.length > 0 && temp.attr('time') > repo.pushed_at) {
								temp = temp.next();
							}
							
							if(temp.length == 0 || repo.pushed_at == null) {
								list.append(html);
							}
							else {
								jQuery(html).insertBefore(temp);
							}
							
							if(old.length > 0) {
								old.remove();
							}
						}
					});
				}
			},
			
			/**
			 * List
			 * 
			 * @param contextId Context ID requesting display.
			 * @param repos Watched repositories to be displayed.
			 */
			list: function(contextId, repos) {
				App.content.post(contextId, Watched.name, function() {
					App.content.display(Watched.html.list(repos));
				});
			}
		},
		
		html: {
			
			/**
			 * Item
			 * 
			 * @param repo Item to generate HTML for.
			 * @return Watched repo list item HTML.
			 */
			item: function(repo) {
				
				if(!repo) {
					return "";
				}
				
				return "<li class='repo " + (repo['private'] ? "private" : "public") + "' id='" + repo.id + "' time='" + repo.pushed_at + "'>"
				     + "<a href='" + repo.html_url + "' target='_blank'>"
					 + "<span class='user'>" + repo.owner.login + "</span>"
					 + "/"
					 + "<span class='repo'>" + repo.name + "</span>"
					 + "</a>"
					 + "</li>";
			},
			
			/**
			 * List
			 * 
			 * @param repos Watched repos to create HTML list for.
			 * @return Watched repo list in HTML.
			 */
			list: function(repos) {	
				var html = Repos.filter.html();	
				html += "<ul class='watched_list'>";
				
				if(repos) {
					for(var i in repos) {
						html += Watched.html.item(repos[i]);
					}
				}
				
				html += "</ul>";
				return html;
			}
		},
		
		load: {
			
			/**
			 * Cache
			 * 
			 * @param context Context requesting load.
			 */
			cache: function(context) {
				var cache = Cache.load(context.id, Watched.name);
				
				if(cache != null) {
					Watched.display.list(context.id, cache.data);
				}
				
				if(!cache || cache.expired) {
					Watched.load.refresh(context);
				}
			},
			
			/**
			 * Github
			 * 
			 * @param context Context requesting repositories.
			 * @param token Users OAuth2 token.
			 */
			github: function(context, token) {
				(function getWatchedRepos(buffer, page) {
					jQuery.getJSON("https://api.github.com/user/watched", {access_token: token, page: page})
						.success(function(json) {
							if(json.length > 0) {
								json = Watched.filter.apply.removeUserRepos(json, context.login);
								Socket.postMessage(Watched.name, "display", "append", [context.id, json]);
								getWatchedRepos(buffer.concat(json), ++page);
							}
							else {
								buffer = Watched.filter.apply.recentlyPushed(buffer);
								Cache.save(context.id, Watched.name, buffer);
								Socket.postComplete();
							}
						});
				})([], 1);				
			},
			
			/**
			 * Refresh
			 *
			 * @param context Context requesting refresh.
			 */
			refresh: function(context) {
				Socket.postMessage(Watched.name, "load", "github", [context, OAuth2.getToken()]);
			}
		}
	};
	
	Watched.init();
})();