var Word = Backbone.Model.extend({
  move: function() {
    this.set({ y: this.get("y") + this.get("speed") });
  }
});

var Words = Backbone.Collection.extend({
  model: Word
});

var WordView = Backbone.View.extend({
  initialize: function() {
    $(this.el).css({ position: "absolute" });
    var string = this.model.get("string");
    var letter_width = 25;
    var word_width = string.length * letter_width;

    const ubahPosisiTidakTerbentur = () => {
      if (this.model.get("x") + word_width > $(window).width()) {
        this.model.set({ x: $(window).width() - word_width });
      }
    };

    ubahPosisiTidakTerbentur();
    // membuat ukuran text tidak terbentur
    $(window).resize(ubahPosisiTidakTerbentur);

    for (var i = 0; i < string.length; i++) {
      $(this.el).append(
        $("<div>")
          .css({
            width: letter_width + "px",
            padding: "5px 2px",
            "border-radius": "4px",
            "background-color": "#fff",
            border: "1px solid #ccc",
            "text-align": "center",
            float: "left"
          })
          .text(string.charAt(i).toUpperCase())
      );
    }

    this.listenTo(this.model, "remove", this.remove);

    this.render();
  },

  render: function() {
    $(this.el).css({
      top: this.model.get("y") + "px",
      left: this.model.get("x") + "px"
    });
    var highlight = this.model.get("highlight");
    $(this.el)
      .find("div")
      .each(function(index, element) {
        if (index < highlight) {
          $(element).css({
            "font-weight": "bolder",
            "background-color": "#aaa",
            color: "#fff"
          });
        } else {
          $(element).css({
            "font-weight": "normal",
            "background-color": "#fff",
            color: "#000"
          });
        }
      });
  }
});

var TyperView = Backbone.View.extend({
  initialize: function() {
    var wrapper = $("<div>").css({
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%"
    });
    this.wrapper = wrapper;

    var self = this;
    var text_input = $("<input>")
      .addClass("form-control")
      .css({
        "border-radius": "4px",
        position: "absolute",
        bottom: "0",
        "min-width": "80%",
        width: "80%",
        "margin-bottom": "10px",
        "z-index": "1000"
      })
      .keyup(function(evt) {
        var words = self.model.get("words");
        // implement salah ketik salah skor
        // if (evt.which !== 8) {
        //   const setOfCharacterAtScreen = new Set(
        //     words.map(item => item.get("string").toLowerCase()).join("")
        //   );
        //   const skor = self.model.get("skor");
        //   const karakterDiketik = String.fromCharCode(evt.which);
        //   console.log(
        //     setOfCharacterxAtScreen.has(karakterDiketik.toLocaleLowerCase())
        //   );
        // }
        const statusGame = self.model.get("statusGame");
        if (["STOP", "PAUSE"].some(status => status === statusGame)) {
          // stop event
          return;
        }

        if (evt.which !== 8) {
          const listKata = words.map(item => item.get("string").toLowerCase());
          const tulisanDiketik = $(this)
            .val()
            .toLowerCase();
          const isSalahKata = !listKata.some(kata =>
            kata.includes(tulisanDiketik)
          );
          let skor = self.model.get("skor");
          if (isSalahKata) {
            skor -= 1;
            self.model.set({ skor });
          }
          console.log(skor);
        }

        for (var i = 0; i < words.length; i++) {
          var word = words.at(i);
          var typed_string = $(this).val();
          var string = word.get("string");
          if (string.toLowerCase().indexOf(typed_string.toLowerCase()) == 0) {
            word.set({ highlight: typed_string.length });
            if (typed_string.length == string.length) {
              $(this).val("");
              // increase skor
              let skor = self.model.get("skor");
              self.model.set({ skor: skor + string.length });
            }
          } else {
            word.set({ highlight: 0 });
          }
        }
      });

    $(this.el).append(
      wrapper.append(
        $("<form>")
          .attr({
            role: "form"
          })
          .submit(function() {
            return false;
          })
          .append(text_input)
      )
    );

    text_input.css({ left: (wrapper.width() - text_input.width()) / 2 + "px" });
    text_input.focus();

    this.listenTo(this.model, "change", this.render);
  },

  render: function() {
    var model = this.model;
    var words = model.get("words");

    for (var i = 0; i < words.length; i++) {
      var word = words.at(i);
      if (!word.get("view")) {
        var word_view_wrapper = $("<div>");
        this.wrapper.append(word_view_wrapper);
        word.set({
          view: new WordView({
            model: word,
            el: word_view_wrapper
          })
        });
      } else {
        word.get("view").render();
      }
    }
  }
});

const handleDisableButton = (
  listExcept = [],
  handleSelector,
  activeID = ""
) => {
  const listIDButton = ["start", "pause", "resume", "stop"];
  const disabledButton = (id, status = true) =>
    handleSelector(`#${id}`).attr("disabled", status);
  listIDButton.forEach(id => {
    disabledButton(id);
    if (activeID.length) handleSelector(`#${id}`).removeClass("active");
  });
  listExcept.forEach(id => {
    disabledButton(id, false);
  });
  if (activeID.length) {
    handleSelector(`#${activeID}`).addClass("active");
  }
};

var SkorView = Backbone.View.extend({
  template: _.template(
    `<h3 class='skor'>Skor: 
      <% if (skor >= 0) { %>
          <span class="positif"><%= skor %> </span>
      <% } else {%>
          <span class="negatif"><%= skor %> </span>
      <% }%>
    </h3>`
  ),
  render: function() {
    // agar rerender tidak berlapis
    $(".skor").remove();
    $(this.el).append(this.template(this.model.toJSON()));
    return this;
  },
  initialize: function() {
    this.render();
    this.model.on("change", this.render, this);
  }
});

var GameControlView = Backbone.View.extend({
  template: _.template(`
    <div class="game-control">
      <button id="start" class="btn-active">start</button>
      <button id="pause">pause</button>
      <button id="resume">resume</button>
      <button id="stop">stop</button>
    </div>
  `),
  render: function() {
    $(this.el).append(this.template(this.model.toJSON()));
    return this;
  },
  initialize: function() {
    $(".form-control").attr("disabled", true);
    this.render();
    handleDisableButton(["start"], $, "stop");
  },
  events: {
    "click #start": "handleStart",
    "click #pause": "handlePause",
    "click #resume": "handleResume",
    "click #stop": "handleStop"
  },
  handleStart: function() {
    const statusGame = this.model.get("statusGame");
    // hanya jalan jika status sama dengan stop
    if (statusGame !== "STOP") return;

    console.log("start");
    this.model.start();
    $(".form-control").attr("disabled", false);
    $(".form-control").focus();
    handleDisableButton(["stop", "pause"], $, "start");
  },
  handlePause: function() {
    const statusGame = this.model.get("statusGame");
    // hanya jalan jika status sama dengan stop
    if (!["START", "RESUME"].some(status => status === statusGame)) return;

    console.log("pause");
    this.model.pause();
    $(".form-control").attr("disabled", true);
    handleDisableButton(["resume"], $, "pause");
  },
  handleResume: function() {
    const statusGame = this.model.get("statusGame");
    // hanya jalan jika status sama dengan stop
    if (statusGame !== "PAUSE") return;

    console.log("resume");
    this.model.resume();
    $(".form-control").attr("disabled", false);
    $(".form-control").focus();
    handleDisableButton(["pause", "stop"], $, "resume");
  },
  handleStop: function() {
    const statusGame = this.model.get("statusGame");
    if (!["START", "RESUME"].some(status => status === statusGame)) return;

    console.log("stop");
    this.model.stop();
    $(".form-control").attr("disabled", true);
    handleDisableButton(["start"], $, "stop");
  }
});

var Typer = Backbone.Model.extend({
  defaults: {
    max_num_words: 10,
    min_distance_between_words: 50,
    words: new Words(),
    min_speed: 1,
    max_speed: 5,
    iterateON: null,
    skor: 0,
    statusGame: "STOP"
  },

  initialize: function() {
    new TyperView({
      model: this,
      el: $(document.body)
    });
    new SkorView({
      model: this,
      el: $(document.body)
    });
    new GameControlView({
      model: this,
      el: $(document.body)
    });
  },

  start: function() {
    console.log("mulai");

    // animatiaon_delay berpengaru terhadap fps 60fps === 16ms
    var animation_delay = 16;
    var self = this;
    this.a = "d";
    var i = setInterval(function() {
      self.iterate();
    }, animation_delay);
    this.set({ iterateON: i, statusGame: "START", skor: 0 });
  },

  resume: function() {
    // animatiaon_delay berpengaru terhadap fps 60fps === 16ms
    var animation_delay = 16;
    var self = this;
    this.a = "d";
    var i = setInterval(function() {
      self.iterate();
    }, animation_delay);
    this.set({ iterateON: i, statusGame: "RESUME" });
  },

  pause: function() {
    var a = this.get("iterateON");
    clearInterval(a);
    // console.log("iy");
    this.set({ statusGame: "PAUSE" });
  },

  stop: function() {
    console.log("stop");
    var a = this.get("iterateON");
    clearInterval(a);
    // console.log("iy");
    this.destroy();
    var words = this.get("words");
    words.models.forEach(model => {
      model.get("view").remove();
    });
    this.set({ statusGame: "STOP", skor: 0 });
  },

  iterate: function() {
    var words = this.get("words");
    if (words.length < this.get("max_num_words")) {
      var top_most_word = undefined;
      for (var i = 0; i < words.length; i++) {
        var word = words.at(i);
        if (!top_most_word) {
          top_most_word = word;
        } else if (word.get("y") < top_most_word.get("y")) {
          top_most_word = word;
        }
      }

      if (
        !top_most_word ||
        top_most_word.get("y") > this.get("min_distance_between_words")
      ) {
        var random_company_name_index = this.random_number_from_interval(
          0,
          company_names.length - 1
        );
        var string = company_names[random_company_name_index];
        var filtered_string = "";
        for (var j = 0; j < string.length; j++) {
          if (/^[a-zA-Z()]+$/.test(string.charAt(j))) {
            filtered_string += string.charAt(j);
          }
        }

        var word = new Word({
          x: this.random_number_from_interval(0, $(window).width()),
          y: 0,
          string: filtered_string,
          speed: this.random_number_from_interval(
            this.get("min_speed"),
            this.get("max_speed")
          )
        });
        words.add(word);
      }
    }

    var words_to_be_removed = [];
    for (var i = 0; i < words.length; i++) {
      var word = words.at(i);
      word.move();

      if (
        word.get("y") > $(window).height() ||
        word.get("move_next_iteration")
      ) {
        words_to_be_removed.push(word);
      }

      if (
        word.get("highlight") &&
        word.get("string").length == word.get("highlight")
      ) {
        // this.pause();
        word.set({ move_next_iteration: true });
      }
    }

    for (var i = 0; i < words_to_be_removed.length; i++) {
      words.remove(words_to_be_removed[i]);
    }

    this.trigger("change");
  },

  random_number_from_interval: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
});
