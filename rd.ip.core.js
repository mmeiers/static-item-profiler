//use http://closure-compiler.appspot.com for deployment
if (!window['rd']) { window['rd'] = {}; }
if (!window['rd']['ip']) { window['rd']['ip'] = {}; }

rd.ip.core = {};

rd.ip.core.init = function() {

    window.addEventListener("message", handleExternalMessages, false);

    var me = this;

	me.timerId = 0;
	me.currentProfile = 0;
	me.totalProfile = 0;
	
    me.profiles = []; //all current profiles
    me.filteredProfiles = []; //filtered profiles
    me.featuredProfiles = []; //featured profiles
    me.activeCards = [];    //list of visible cards

	me.duration = 12;
	
    me.floatingProfileBgImg = new Image();
    me.floatingProfileBgImg.src = rd.ip.globals.FLOATING_PROFILE_BG_IMAGE_SRC;

    me.profileDetails = new rd.ip.ProfileDetails();
    me.featuredProfileCard = new rd.ip.FeaturedProfileCard();

    me.filter1 = new rd.ip.Filter(rd.ip.globals.ELEMENT_FILTER_BOX_1, rd.ip.globals.ELEMENT_FILTER_LIST_1);
    me.filter1.onClick = function() { me.filterProfiles(); }

    me.filter2 = new rd.ip.Filter(rd.ip.globals.ELEMENT_FILTER_BOX_2, rd.ip.globals.ELEMENT_FILTER_LIST_2);
    me.filter2.onClick = function() { me.filterProfiles(); }

    me.keyboard = new rd.ip.Keyboard();
    me.keyboard.onEnter = function() { me.filterProfiles(); }

    var urlParams = me.getUrlParams();
    _dataUrl_ = urlParams.data;
    if (_dataUrl_) {
        _dataUrl_ = unescape(_dataUrl_);
        _dataUrl_ = _dataUrl_.replace("_://", "://");
    }
    if (urlParams.refresh) {
        rd.ip.data.refreshInterval = parseInt(urlParams.refresh);
    }
    me.companyId = urlParams.companyId ? urlParams.companyId : "RISEMASTER";
    me.duration = urlParams.duration;
    me.displayId = urlParams.displayId ? urlParams.displayId : "PREVIEW";
    me.autoPlay = urlParams.play ? (urlParams.play == "1" || urlParams.play == "true") : false;
    //me.useProxy = (urlParams.useproxy == 1) ? true : false;
    me.useProxy = rd.ip.globals.USE_IMAGE_PROXY;

    window.addEventListener("click", handleWindowClick, false);

    //create profile that is simply a placeholder for the "NO IMAGE" image
    me.noImageProfile = new rd.ip.Profile([rd.ip.globals.NO_IMAGE_URL]);

    me.lic = new rd.Lic("ItemProfiler", me.displayId, me.companyId, "err");
    me.lic.start(function() { me.onAuthChecked(); });

    rd.ip.data.init(rd.ip.core.handleOnDataLoaded);
};

rd.ip.core.filterProfiles = function() {
    this.filteredProfiles = [];

    for (var i in this.profiles) {
        if (this.filter1.filterStr && this.filter1.filterStr != this.profiles[i].filter1) {
            continue;
        }
        if (this.filter2.filterStr && this.filter2.filterStr != this.profiles[i].filter2) {
            continue;
        }
        if (!this.profileMatchesSearchStr(this.profiles[i])) {
            continue;
        }
        this.filteredProfiles.push(this.profiles[i]);
    }

    this.initWorldObjects();
};

rd.ip.core.profileMatchesSearchStr = function(profile) {
    var res = true;
    try {
        if (this.keyboard.searchStr && rd.ip.globals.SEARCHABLE_COLUMNS && rd.ip.globals.SEARCHABLE_COLUMNS.length > 0) {
            var s = "";
            for (var i in rd.ip.globals.SEARCHABLE_COLUMNS) {
                s += " " + profile.data[rd.ip.globals.SEARCHABLE_COLUMNS[i]];
            }

            res = s.toUpperCase().indexOf(this.keyboard.searchStr) != -1;
        }
    }
    catch (err) { }

    return res;
}

rd.ip.core.clearFilters = function() {
    this.filter1.clear();
    this.filter2.clear();
    this.keyboard.clear();

    this.filteredProfiles = []; //clear array
    this.filteredProfiles = this.profiles.slice(0); //copy all elements of the profiles array

    this.initWorldObjects();
};

rd.ip.core.handleOnDataLoaded = function(newProfiles, headerData) {
    me = rd.ip.core;

    me.profiles = newProfiles;
	
	me.totalProfile = me.profiles.length;
    //change filter lables
    /*
	if (headerData) {
        var headerProfile = new rd.ip.Profile(headerData);
        me.filter1.updateLabel(headerProfile.filter1);
        me.filter2.updateLabel(headerProfile.filter2);
    }
    */
    me.filterProfiles();

    me.initFilters();

	me.preloadImages();
	//me.restartTimer();
	me.onTimer();
	
    if (parent) {
        parent.postMessage("ready", "*");
    } else if (me.autoPlay) {
    	webGLStart();
    	me.initWorldObjects();
    	//me.featuredProfileCard.restart();
        //startAnimation();
		for(var iCnt=0;iCnt<me.profiles.length;iCnt++){
			console.log(me.profiles[iCnt]);
		}
    }

};

rd.ip.core.initWorldObjects = function() {
    rd.ip.floatingProfileCard.clearTexturePool();
    rd.ip.core.activeCards = [];
    if (rd.ip.core.filteredProfiles.length > 0) {
        for (var i = 0; i < rd.ip.globals.MAX_ACTIVE_CARDS; i++) {
            var card = new rd.ip.FloatingProfileCard();
            card.profile = rd.ip.floatingProfileCard.getNextProfile(card, 1);

            rd.ip.core.activeCards.push(card);
        }
        //sort by Z
        rd.ip.core.activeCards.sort(function(a, b) { return a.z - b.z; });
    }
};

rd.ip.core.initFilters = function() {
    var items1 = [];
    var items2 = [];
    for (var i in this.profiles) {
        if (this.profiles[i].filter1) {
            if (!this.arrayHasValue(items1, this.profiles[i].filter1)) {
                items1.push(this.profiles[i].filter1);
            }
        }
        if (this.profiles[i].filter2) {
            if (!this.arrayHasValue(items2, this.profiles[i].filter2)) {
                items2.push(this.profiles[i].filter2);
            }
        }
    }
    this.filter1.items = items1.sort();
    this.filter2.items = items2.sort();
};

rd.ip.core.arrayHasValue = function(items, value) {
    for (var i in items) {
        if (items[i] === value) {
            return true;
        }
    }
    return false;
};

rd.ip.core.getUrlParams = function() {
    var res = {}; //object
    try {
        var items = document.location.search.substr(1).split('&');
        for (var i in items) {
            var kv = items[i].split('=');
            if (kv.length == 2) {
                res[kv[0]] = kv[1]; //create new property and assign value
            }
        }
    }
    catch (err) {
    }
    return res;
};

rd.ip.core.onAuthChecked = function() {
	//no need to do anything
};

rd.ip.core.clearUI = function() {
    if (this.profileDetails) { this.profileDetails.hide(); }
    if (this.keyboard) { this.keyboard.hide(); }
    if (this.filter1) { this.filter1.hide(); }
    if (this.filter2) { this.filter2.hide(); }
};

rd.ip.core.reset = function() {
    this.clearUI();
    this.clearFilters();
};

rd.ip.core.showKeyboard = function() {
    this.clearUI();
    this.keyboard.show();
};

rd.ip.core.restartTimer = function() {
    clearTimeout(me.timerId);
    var interval = me.duration * 1000; //24 hours
    //var _this = this;
    me.timerId = setTimeout(function() { me.onTimer(); }, interval);
};

rd.ip.core.onTimer = function() {
    me.restartTimer();
	$('.background').fadeTo('slow', 0, function() {
		me.nextProfile();
		$('.background').css('opacity', 1);
		
	});
	
    //this.checkAuth();
    //if (this.callback) {
    //    callback(this.isAuth);
    //}
};

rd.ip.core.nextProfile = function() {
	var bValid = false;
	for(var i=0; i<11; i++){
		if('' != me.profiles[me.currentProfile].data[i]){
			bValid = true;
			break;
		}
	}
	if(!bValid){
		if(me.currentProfile < (me.totalProfile - 1))
			me.currentProfile++;
		else
			me.currentProfile = 0;
		me.nextProfile();
	} else {
		$('.title').html(me.profiles[me.currentProfile].data[0]);
		$('.subtitle').html(me.profiles[me.currentProfile].data[1]);
		$('.description').html(me.profiles[me.currentProfile].data[2]);
        $('.time2').html(me.profiles[me.currentProfile].data[3]);		
		$('.caption').html(me.profiles[me.currentProfile].data[4]);
		$('.date').html(me.profiles[me.currentProfile].data[5]);
		$('.time-location').html(me.profiles[me.currentProfile].data[6]);
		$('.registration-url').html(me.profiles[me.currentProfile].data[7]);
		$('.registration-qr').html(me.profiles[me.currentProfile].data[8]);
		$('.interest-to').html(me.profiles[me.currentProfile].data[9]);
        $('.website').html(me.profiles[me.currentProfile].data[10]);
        $('.location').html(me.profiles[me.currentProfile].data[11]);
		$('.background').css("background-image", "url('" + me.profiles[me.currentProfile].data[12] + "')");
		
		if(me.currentProfile < (me.totalProfile - 1))
			me.currentProfile++;
		else
			me.currentProfile = 0;
	}
};

rd.ip.core.preloadImages = function() {
	for(var i=0; i<me.totalProfile; i++){
		var c=new Image();
		c.src = me.profiles[i].data[12];
		
	}
};
