/* jQuery at Responsive Accordion or Tabs - v1.0.5 - 2016-03-28
* https://github.com/stazna01/jQuery-rt-Responsive-Tables
*
* This plugin is built heavily upon the work by Chris Coyier
* found at http://css-tricks.com/responsive-data-tables/
*
* Copyright (c) 2016 Nathan Stazewski; Licensed MIT */

(function ( $ ) {
$.fn.accordionortabs = function( options ) {
	// This is the easiest way to have default options.
	var settings = $.extend({
		// These are the defaults.
		defaultOpened: 0,
		containerBreakPoint: 0, //allows a user to force the vertical mode at a certain pixel width of its container, in the case when a table may technically fit but you'd prefer the vertical mode
		tabsIfPossible: true,
		hashbangPrefix: 'tabset_',
		centerTabs: false
		}, options );
		
	startingOuterWidth =  $(window).width(); //used later to detect orientation change across all mobile browsers (other methods don't always work on Android)
	is_iOS = /(iPad|iPhone|iPod)/g.test( navigator.userAgent ); //needed due to the fact that iOS scrolling causes false resizes
	
	function find_max_tab_width (accordion_or_tabs_object, tabs_when_possible_index, skip_fix_accordion_or_tabs_function) {
		skip_fix_accordion_or_tabs_function = (typeof skip_fix_accordion_or_tabs_function === 'undefined') ? false : skip_fix_accordion_or_tabs_function;
		// if first width check is when the screen is smaller and an accordion pane has wrapped to two lines, the max tab width will be incorrect, so anytime an accordion is switching back to tabs, this function is called again to make sure it really should be changing at that point
		accordion_or_tabs_object.addClass('at-tabs');
		tabs_width = 0;
		$('> li > a', accordion_or_tabs_object ).each(function( index ) {
			tabs_width = tabs_width + $(this).outerWidth(true) + 5;
			if (index == 0 && settings.centerTabs === true) {
				tabs_width = tabs_width - $(this).css('margin-left').replace(/[^-\d\.]/g, '');
				}
			if (index == $(this).closest('.at-accordion-or-tabs').find('> li > a').length-1) {
				largest_tab_widths[tabs_when_possible_index] = tabs_width + 15;
				if (skip_fix_accordion_or_tabs_function===false) {
					fix_accordion_or_tabs();
					}
				}
			})
		}
	function find_first_tab_width (accordion_or_tabs_object, tabs_when_possible_index) {
		// need to check if tab sizes have changed, which would indicate a breakpoint has been hit that changed the size of the tabs (which means we'd need to recompute the max tab width). The easiest way is to keep track of the first tab for each tab set and then check on each resize if the first tabs have changed size.
		skip_fix_accordion_or_tabs_function = (typeof skip_fix_accordion_or_tabs_function === 'undefined') ? false : skip_fix_accordion_or_tabs_function;
		accordion_or_tabs_object.addClass('at-tabs');
		$first_tab_width = $('> li > a', accordion_or_tabs_object ).eq( 0 ).outerWidth(true);
		if(typeof first_tab_widths[tabs_when_possible_index] == 'undefined') {
			first_tab_widths[tabs_when_possible_index] = $first_tab_width;
			} else if ($first_tab_width != first_tab_widths[tabs_when_possible_index]) {
				 first_tab_widths[tabs_when_possible_index] = $first_tab_width;
				 find_max_tab_width (accordion_or_tabs_object, tabs_when_possible_index,true);
				}
		}
	window.fix_accordion_or_tabs = function() {
		if ($(".at-accordion-or-tabs.at-tabs-when-possible").length) {
			
			$(".bbq.at-accordion-or-tabs.at-tabs-when-possible").each(function( index ) {
				tabs_when_possible_index = index;
				if ($(this).attr("data-rtContainerBreakPoint")) {
					rt_user_defined_container_breakpoint = $(this).attr("data-rtContainerBreakPoint");
					} else {
						rt_user_defined_container_breakpoint = settings.containerBreakPoint;
						}
				find_first_tab_width($(this),tabs_when_possible_index);
				if (largest_tab_widths[index] > $(this).width() || rt_user_defined_container_breakpoint >= $(this).width()) { //the width the tabs needs is greater than the available width and the optional user defined container width
					if (settings.centerTabs === true) {
						$(this).find('>li>a').eq(0).css('margin-left','');  
						}
					$(this).removeClass('at-tabs');
					var idx = $.bbq.getState( $(this).attr('data-tabset-id'), true ) || 0;
					if(idx == 0) { //the first tab is showing but only because a tab has to be open, when converting back to an accordion it gets shut because no hashbang exists to have it open
						$(this).addClass('at-accordion-closed').find('>li>a').eq(0).removeClass('active').next('section').removeClass('is-open').hide();
						}
					} else { //there is enough room for the tabs to be shown
						if (settings.centerTabs === true) {
							$(this).find('>li>a').eq(0).css('margin-left',($(this).outerWidth(true) - largest_tab_widths[index])/2 + 10);
							}
						if($(this).hasClass('at-accordion-closed')) { //at-accordion-closed is assigned when an accordion gets converted to tabs and a tab has to be open. this class lets it be known that it should be closed again if converted back to an accordion
							$(this).removeClass('at-accordion-closed').find('>li>a').eq(0).addClass('active').next('section').addClass('is-open').show().focus();
							find_max_tab_width ($(this),tabs_when_possible_index); //it's possible the browser was started so small that the text in an accordion pane was taking up more than one line (so the max width is wrong), therefore when accordions switch to tabs we recheck the tab widths and update the array holding those widths
							}
						}
				});			
				}
		}
	if (settings.tabsIfPossible == true) {
		this.addClass('at-tabs-when-possible');
		}
	this.find('>li>section').attr('aria-live','assertive');
	if (settings.defaultOpened != 0) {
		this.each(function( index ) {
			if(settings.defaultOpened <= $(this).find('>li').length) {
				$(this).attr('data-default-opened',settings.defaultOpened);
				}
			
			});
		
		}
	this.addClass('bbq clearfix at-accordion-or-tabs').find('>li>a').prepend('<span class="at-tab-one-pixel-fix-left"></span><span class="at-tab-one-pixel-fix-right"></span>');
	this.each(function( index ) {
			$(this).attr('data-tabset-id',settings.hashbangPrefix+index);
			$(this).find('>li>a').each(function( index2 ) {
				$(this).attr('href','!#'+settings.hashbangPrefix+index+'='+index2);
				$(this).next('section').prepend('<h1 class="aria-only">'+$(this).text()+'</h1>');
				});
			});
	
	$(document).ready(function () {
		$.param.fragment.ajaxCrawlable( true ); // Enable "AJAX Crawlable" mode. (uses #! instead of just #)
		
		largest_tab_widths = new Array();
		first_tab_widths = new Array();

		$(".bbq.at-accordion-or-tabs.at-tabs-when-possible").each(function( index ) {
			find_first_tab_width ($(this), index);
			find_max_tab_width ($(this), index);
			});
			
		$('.bbq.at-accordion-or-tabs').each(function( index ) {
			var current_hash = $.bbq.getState( $(this).attr('data-tabset-id'), true ) || 0;
			var default_state = $(this).attr('data-default-opened');
			if (current_hash == 0 && default_state !== undefined && default_state != '') { //if there is no hash for this set but there is a default set, push that default
				var state = {},
				// Get the id of this tab widget.
				id = $(this).attr( 'data-tabset-id' );
				 
				// Set the state!
				state[ id ] = default_state;
				$.bbq.pushState( state );
				}
			
			});
		
		$('.at-accordion-or-tabs').on('click', '> li > a', function(e) {
			if(!$(this).hasClass('active')) {
				var state = {},
				// Get the id of this tab widget.
				id = $(this).closest( '.bbq' ).attr( 'data-tabset-id' ),
				
				// Get the index of this tab.
				idx = $(this).parent().prevAll().length + 1;
				 
				// Set the state!
				state[ id ] = idx;
				$.bbq.pushState( state );
				} else if (!$(this).closest('.at-accordion-or-tabs').hasClass('at-tabs')) { // if it's an accordion (which can open and close)
					var id = $(this).closest( '.bbq' ).attr( 'data-tabset-id' ); // Get the id of this tab widget.
					$.bbq.removeState(id);
					}
			$(this).blur();
			e.preventDefault();
			});
			
		$(window).trigger( "hashchange" ); //in case it's loaded immediately with a hashbang we need to trigger it on the first load
		}); //end $(document).ready
			
	$(window).resize(function() {
		if(!is_iOS || (is_iOS && (startingOuterWidth !== $(window).width()))) {
			startingOuterWidth = $(window).width(); //MUST update the starting width so future orientation changes will be noticed
			fix_accordion_or_tabs();
			}
		});
	
	
	$(window).on( 'hashchange', function(e) {
 
		// Iterate over all tab widgets.
		$('.bbq').each(function(){
			
			// Get the index for this tab widget from the hash, based on the
			// appropriate id property. In jQuery 1.4, you should use e.getState()
			// instead of $.bbq.getState(). The second, 'true' argument coerces the
			// string value to a number.
			var idx = $.bbq.getState( $(this).attr('data-tabset-id'), true ) || 0;
			if (idx > 0) { //if at least some sort of hash has been set for this .bbq item
				if (!$(this).find('>li>a').eq(idx - 1).hasClass('active')) { //only run this section if a different tab/accordion pane has been selected than the active one (note the !...and also note that an accordion might have no active pain...such as an all closed accordion...which would skip this if statement)
					if($(this).hasClass('at-tabs')) {
						$(this).find('.is-open').removeClass('is-open').hide();
						$(this).find('>li>section').eq( idx - 1 ).toggleClass('is-open').toggle();
						} else {
							$(this).find('.is-open').removeClass('is-open').slideToggle();
							$(this).find('>li>section').eq( idx - 1 ).toggleClass('is-open').slideToggle();
							}
					$(this).find('.active').removeClass('active');
					$(this).find('>li>a').eq( idx - 1 ).addClass('active').blur();
					}
				$(this).removeClass('at-accordion-closed'); //needs to be after the if statement so that a fully closed accordion that is opened will have this class removed
				} else { // if no hash has been set for this .bbq item
						if ($(this).hasClass("at-accordion-or-tabs") && (!$(this).hasClass("at-tabs"))) { //this is how accordion panes get closed
							$(this).addClass('at-accordion-closed').find('>li>a.active').removeClass('active').next('section').removeClass('is-open').slideUp();
							} else if ($(this).hasClass("at-accordion-or-tabs") && ($(this).hasClass("at-tabs") && !$(this).hasClass('at-accordion-closed'))) { //this is how accordion panes get closed
								$(this).addClass('at-accordion-closed').find('>li>a.active').removeClass('active').next('section').removeClass('is-open').hide();
								$(this).children('li').first().children('a').addClass('active').next('section').addClass('is-open').show();
								}
						}
			});
		});
	return this;
	};
}( jQuery ));