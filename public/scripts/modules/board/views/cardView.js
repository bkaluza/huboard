define(["text!../templates/card.html","../models/card", "../events/postal"],function(template,card, postal){

  return Backbone.View.extend({
    initialize: function ( params ) {
      this.issue = new card({model:params.issue, user:params.user,repo: params.repo});
      _.bind(this,'moved',this.moved);
      _.bind(this,'drop',this.drop);
      postal.subscribe("Filter.*", $.proxy(this.filter, this));
      postal.subscribe("XFilter", $.proxy(this.xfilter, this));
      postal.socket(params.user + "/" + params.repo,"Moved." + params.issue.number, $.proxy(this.onMoved,this));
      postal.socket(params.user + "/" + params.repo,"Closed." + params.issue.number, $.proxy(this.onClosed,this));

      this.filtersHash = {};
    },
    events: {
      "moved" : "moved",
      "click .milestone": "publishFilter",
      "click .close": "closed",
      "drop" : "drop"
    },
    tagName:"li",
    onMoved: function(data){
      postal.publish("Moved.Socket." + data.index,{card: this});
    },
    onClosed: function(){
      this.remove();
      postal.publish("Closed.Issue",{card: this});
    },
    render: function(){


      $(this.el).html( _.template(template, this.issue.attributes))
      .addClass("drop-shadow")
      .data("issue",this.issue.attributes);
      if(this.issue.attributes.repo.color){
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(this.issue.attributes.repo.color);
        var rgb = result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;

        var rgbacolor = "4px solid rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.7)";
        $(this.el)
        .css({
          border: rgbacolor,
          "border-radius" : "8px"
        });

      }
      return this;
    },
    moved: function(ev,index){
      this.issue.save({index: index});
    },
    closed: function(ev, index){
      ev.preventDefault();
      this.issue.close({index: index});
      this.remove();
      postal.publish("Closed.Issue",{card: this});
    },
    publishFilter: function() {
      var self = this;
      postal.publish("Filter.Milestone", 
                     function (issue) { 
                       return issue.milestone ? issue.milestone.number === self.issue.attributes.milestone.number : false;
                     });
    },
    filter: function (shouldFilter) {
      $(this.el).toggle(shouldFilter(this.issue.attributes));
    },
    xfilter: function(message){
      var self = this;

      console.log("filter", message);

      this.filtersHash[message.id] = message;
      var filters = [];
      for(var key in this.filtersHash) {
          filters.push(this.filtersHash[key]);
      }
      var fade = _.filter(filters,function(f){ return f.state === 1;});
      var hide = _.filter(filters,function(f){ return f.state === 2;});
      if(_.any(hide,function(f){ return !f.condition(self.issue.attributes); })){
         $(self.el).hide();
         return;
      }
      if(_.any(fade,function(f){ return !f.condition(self.issue.attributes); })){
         $(self.el).css({display:"block",opacity: 0.3});
         return;
      }
      $(self.el).css({display:"block",opacity: 1});
    },
    drop: function(ev,order){
      this.issue.reorder({order:order});
    }
  });

});
