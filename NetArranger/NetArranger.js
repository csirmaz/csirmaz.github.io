/*
NetArranger v1.4 Copyright (c) Elod Csirmaz 2014
<https://github.com/csirmaz/NetArranger>

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
This file is part of NetArranger
<https://github.com/csirmaz/NetArranger>

Copyright (c) 2014 Elod Csirmaz

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

This file uses EdnaScript. Please see
<https://github.com/csirmaz/EdnaScript>
*/

NetArranger = {};

/* Class NetArranger.Main */

   NetArranger.Main = function(data, options){
      /*
         Incoming data has the following format:
         {
            <LABEL> : { html:<HTML>, css:<CSS_CLASS>, c:[<LIST OF LABELS>] },
            ...
         }
         The keys 'css' and 'c' are optional.

         Options are optional.

         (!) Create this object after the board DOM element is ready.
      */
      // Default options
      this._options = {
         board:'#board',
         boardsize:[500, 500],
         zoom: 5,
         arranger_force: -.01,
         attractor_force: .008,
         init_heat: 10,
         min_heat: .001,
         heat_reduction_time: 1000
      };

      var me = this;
      if(options){ $.extend(this._options, options); }

      this._boardsize = new NetArranger.Point(this._options.boardsize[0], this._options.boardsize[1]);
      this._boardoffset = this._boardsize.pclone_div(2);
      this._options.shakerad = Math.min(this._options.boardsize[0], this._options.boardsize[1]) / this._options.zoom;

      this._board = $(this._options.board).css({ width: this._boardsize._x+'px', height: this._boardsize._y+'px' });
      this._points = []; // list of WorldPoint objects
      this._points_labelled = {}; // Pointing from label to WorldPoint objects
      this._paused = false;
      this._heat = this._options.init_heat;
      this._draggednode = false; // false or [WorldPoint, offsetX, offsetY]

      // Construct objects
      for(var k in data){
         if(data.hasOwnProperty(k)){
            this._points_labelled[k] = new NetArranger.WorldPoint({
               main: this,
               html: data[k].html,
               css: data[k].css,
               x: (Math.random()-.5)*this._options.shakerad,
               y: (Math.random()-.5)*this._options.shakerad
            });
            this._points.push(this._points_labelled[k]);
         }
      }
      this._numpoints = this._points.length;

      // Add connections
      for(var k in data){
         if(data.hasOwnProperty(k) && data[k].c){
            data[k].c.forEach(function(e){
               if( typeof(this._points_labelled[e]) == 'undefined' ){
                  try{ console.log('NetArranger: unknown reference', e); }catch(e){}
               }
               else{
                  this._points_labelled[k].add_connection( this._points_labelled[e] );
               }
            }, this);
         }
      }

      // Mouse interactions
      this._board
      .mousemove(function(e){
         if(me._draggednode === false){ return; }
         var o = me._draggednode[0];
         o._x = me._draggednode[1] + e.pageX / me._options.zoom;
         o._y = me._draggednode[2] + e.pageY / me._options.zoom;
         o.redraw();
         me.resetheat();
      })
      .mouseup(function(e){
         me._draggednode = false;
      });


      // Start
      $(function(){
         setInterval(function(){
            if(me._paused){ return; }
            me.step();
         }, 10);

         // Reduce the heat as time passes
         setInterval(function(){
            if(me._paused){ return; }
            me._heat *= .9;
         }, me._options.heat_reduction_time);
      });

      Object.seal(this);
   }

   NetArranger.Main.prototype.step = function(){
      var i, j, davg = 0;
      for(i=0; i<this._numpoints; i++){
         this._points[i].add_arranger_attractor();
      }

      for(i=0; i<this._numpoints; i++){
         for(j=i+1; j<this._numpoints; j++){
            this._points[i].add_repulsion_pair( this._points[j] );
         }
      }

      for(i=0; i<this._numpoints; i++){
         davg += this._points[i].apply_replacement(this._heat);
      }

      // Reduce the heat and stop as the nodes stop
      davg /= this._numpoints;
      if(davg < this._heat / 400){
         this._heat *= .98;
         if(this._heat < this._options.min_heat ){
            this._paused = true;
            try{
               console.log('NetArranger: Done');
            }catch(e){}
         }
      }

      for(i=0; i<this._numpoints; i++){
         this._points[i].redraw();
      }
   };


   // Reset the heat to its maximum value
   NetArranger.Main.prototype.resetheat = function(){
      this._heat = this._options.init_heat;
      this._paused = false;
      return this;
   };

   NetArranger.Main.prototype.redraw = function(){
      for(i=0; i<this._numpoints; i++){
         this._points[i].redraw();
      }
      return this;
   };

   // Call zoom(false) to zoom out, and zoom(true) to zoom in
   NetArranger.Main.prototype.zoom = function(zoomin){
      var displaycenter = this._boardsize.pclone_div(2);
      this._boardoffset.sub(displaycenter).div(this._options.zoom);
      this._options.zoom *= (zoomin ? 1.5 : 1/1.5);
      this._boardoffset.mult(this._options.zoom).add(displaycenter);
      this.redraw();
      return this;
   };

   NetArranger.Main.prototype.scroll = function(horizontally, plusward){
      var prop = (horizontally ? '_x' : '_y');
      this._boardoffset[prop] += (plusward ? 1 : -1) * this._boardsize[prop] / 5;
      this.redraw();
      return this;
   };

/* End of class NetArranger.Main */
/*
This file is part of NetArranger
<https://github.com/csirmaz/NetArranger>

Copyright (c) 2014 Elod Csirmaz

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

This file uses EdnaScript. Please see
<https://github.com/csirmaz/EdnaScript>
*/

/* Class NetArranger.Point */
// Represents a 2D point or vector

   NetArranger.Point = function(x, y){
      this._x = x;
      this._y = y;
      Object.seal(this);
   }

   NetArranger.Point.prototype.info = function(){
      return ('('+this._x+','+this._y+')');
   };

   NetArranger.Point.prototype.pclone = function(){
      return new NetArranger.Point(this._x, this._y);
   };

   // Modifies and returns the current object
   NetArranger.Point.prototype.add = function(other){
      this._x += other._x;
      this._y += other._y;
      return this;
   };

   // Creates a new NetArranger.Point
   NetArranger.Point.prototype.pclone_add = function(other){
      return new NetArranger.Point(other._x + this._x, other._y + this._y);
   };

   // Modifies and returns the current object
   NetArranger.Point.prototype.sub = function(other){
      this._x -= other._x;
      this._y -= other._y;
      return this;
   };

   // Creates a new NetArranger.Point
   NetArranger.Point.prototype.pclone_sub = function(other){
      return new NetArranger.Point(this._x - other._x, this._y - other._y);
   };

   // Modifies and returns the current object
   NetArranger.Point.prototype.mult = function(d){
      this._x *= d;
      this._y *= d;
      return this;
   };

   // Creates a new NetArranger.Point
   NetArranger.Point.prototype.pclone_mult = function(d){
      return new NetArranger.Point(this._x * d, this._y * d);
   };

   // Modifies and returns the current object
   NetArranger.Point.prototype.diag = function(d, e){
      this._x *= d;
      this._y *= e;
      return this;
   };

   // Creates a new NetArranger.Point
   NetArranger.Point.prototype.pclone_diag = function(d, e){
      return new NetArranger.Point(this._x * d, this._y * e);
   };

   // Modifies and returns the current object
   NetArranger.Point.prototype.div = function(d){
      this._x /= d;
      this._y /= d;
      return this;
   };

   // Creates a new NetArranger.Point
   NetArranger.Point.prototype.pclone_div = function(d){
      return new NetArranger.Point(this._x / d, this._y / d);
   };

   // Modifies and returns the current object
   NetArranger.Point.prototype.normalise = function(){
      var l = this.length();
      if(l == 0){ l = 1; }
      this._x /= l;
      this._y /= l;
      return this;
   };

   // Creates a new NetArranger.Point
   NetArranger.Point.prototype.pclone_normalise = function(){
      var l = this.length();
      if(l == 0){ l = 1; }
      return new NetArranger.Point(this._x / l, this._y / l);
   };

   NetArranger.Point.prototype.length = function(){
      return Math.sqrt(this._x*this._x + this._y*this._y);
   };

   // Returns the square of the length of a vector
   NetArranger.Point.prototype.length2 = function(){
      return this._x*this._x + this._y*this._y;
   };

   // Returns the distance between two points
   NetArranger.Point.prototype.dist = function(other){
      var dx = this._x - other._x;
      var dy = this._y - other._y;
      return Math.sqrt(dx*dx+dy*dy);
   };

   NetArranger.Point.prototype.is_same_location = function(other){
      return ((this._x == other._x) && (this._y == other._y));
   };

/* End of class NetArranger.Point */
/*
This file is part of NetArranger
<https://github.com/csirmaz/NetArranger>

Copyright (c) 2014 Elod Csirmaz

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

This file uses EdnaScript. Please see
<https://github.com/csirmaz/EdnaScript>
*/

/* Class NetArranger.WorldPoint */

   NetArranger.WorldPoint = function(d){
      /*
         Incoming data:
         d.x
         d.y
         d.html
         d.css (optional)
         d.main
      */
      var me = this;

      this._x = d.x;
      this._y = d.y;

      this._main = d.main;
      this._connectto = []; // array of [NetArranger.WorldPoint dest, jQuery ArrowObj]
      this._displacement = new NetArranger.Point(0, 0);
      this._css = (typeof(d.css)=='undefined'?'':(' '+d.css));
      this._obj = $(
         '<div class="point'+this._css+'">'+d.html+'</div>'
      ).appendTo(this._main._board);

      this._offset = new NetArranger.Point(0, 0); // Initial value
      setTimeout(function(){
         me._offset = new NetArranger.Point(me._obj.width()/2, me._obj.height()/2);
      }, 100); // Allow time for the browser to render the element

      this._dragged = false; // false or a Point object

      this._obj
      .mousedown(function(e){
         // Highlight node and outgoing connections
         me._main._board.find('div').removeClass('selected selected_dest');
         me._obj.addClass('selected');
         me._connectto.forEach(function(e){
            e[0]._obj.addClass('selected_dest'); // destination
            e[1].addClass('selected'); // edge
         });

         // Begin dragging
         me._main._draggednode = [
            me,
            me._x - e.pageX / me._main._options.zoom,
            me._y - e.pageY / me._main._options.zoom
         ];

         // Prevent text selection
         e.preventDefault();
      });

      this.redraw();
      Object.seal(this);
   }
   NetArranger.WorldPoint.prototype = Object.create(NetArranger.Point.prototype);
   NetArranger.WorldPoint.prototype.constructor = NetArranger.WorldPoint;

   NetArranger.WorldPoint.prototype.add_connection = function(other){
      this._connectto.push([
         other,
         $('<div class="arrow'+this._css+'"></div>').appendTo(this._main._board)
      ]);
      return this;
   };

   // Update _displacement with the arranger force and the attractor force
   NetArranger.WorldPoint.prototype.add_arranger_attractor = function(){
      // Arranger force
      // This prevents migration as it points towards the origin
      // An arranger force that increases linearly with the distance
      this._displacement.add( this.pclone_mult(this._main._options.arranger_force) );

      // Attractor force
      // In both directions to prevent rotation
      this._connectto.forEach(function(e){
         var d = e[0].pclone_sub(this).mult(this._main._options.attractor_force);
         this._displacement.add(d);
         e[0]._displacement.add( d.mult(-1) );
      }, this);
   };

   // Update _displacement for a pair of points with the repulsion force
   NetArranger.WorldPoint.prototype.add_repulsion_pair = function(other){
      var d = this.pclone_sub(other);
      var dl = d.length2();
      if(dl>0){
         d.div(dl);
      }
      else{
         d = new NetArranger.Point(Math.random(), Math.random());
      }
      this._displacement.add(d);
      other._displacement.add( d.mult(-1) );
      return this;
   };

   // Returns the length of the displacement
   NetArranger.WorldPoint.prototype.apply_replacement = function(heat){
      var l;
      if(this._main._draggednode[0] === this){
         l=0;
      }
      else{
         l = this._displacement.mult(heat).length();
         this.add(this._displacement);
      }
      this._displacement = new NetArranger.Point(0, 0);
      return l;
   };

   NetArranger.WorldPoint.prototype.redraw = function(){
      // Move the point object
      var objplace = this.pclone_mult(this._main._options.zoom).sub(this._offset);
      this._obj.css({
         left: this._main._boardoffset._x + objplace._x + 'px',
         top:  this._main._boardoffset._y + objplace._y + 'px'
      });

      // Move the arrow objects
      this._connectto.forEach(function(e){
         var ax = this._x - e[0]._x;
         var ay = this._y - e[0]._y;
         e[1].css({
            left: this._main._boardoffset._x + this._main._options.zoom * Math.min(this._x, e[0]._x) + 'px',
            top:  this._main._boardoffset._y + this._main._options.zoom * Math.min(this._y, e[0]._y) + 'px',
            width:  this._main._options.zoom * Math.abs(ax) + 'px',
            height: this._main._options.zoom * Math.abs(ay) + 'px'
         })
         .toggleClass('ax',(ax<0)?false:true)
         .toggleClass('ay',(ay<0)?false:true);
      }, this);
      return this;
   };

/* End of class NetArranger.WorldPoint */
