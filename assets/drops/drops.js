function PlaceClass(x,y){
	this.x=x;
	this.y=y;
	this.add=function(o){ // modifies current
		this.x+=o.x;
		this.y+=o.y;
		return(this);
	}
	this.distance=function(o){ // returns scalar
		var x=this.x-o.x;
		var y=this.y-o.y;
		return(Math.sqrt(x*x+y*y));
	}
	this.from=function(o){ // returns vector. o --> this
		var p=new PlaceClass(
			(this.x-o.x),
			(this.y-o.y)
		);
		return(p);		
	}
	this.unifrom=function(o){ // returns 1-long vector. o --> this
		var d=this.distance(o);
		var p=new PlaceClass(
			(this.x-o.x)/d,
			(this.y-o.y)/d
		);
		return(p);		
	}
	this.mult=function(m){ // modifies current. mutiply by scalar
		this.x*=m; this.y*=m;
		return(this);
	}
	this.inv=function(){ // modifies current. returns 1/d-long vector
		var ll=this.x*this.x+this.y*this.y;
		this.x/=ll;
		this.y/=ll;
		return(this);
	}
	this.print=function(){
		alert(this.x+','+this.y);
	}
}

function OneDropClass(i, maxp){
	this.html=document.getElementById('drop'+i);
	this.place=new PlaceClass(
		Math.floor(Math.random()*maxp),
		Math.floor(Math.random()*maxp)
	);
	
	this.go=function(){
		this.html.style.left=Math.floor(this.place.x)+'px';
		this.html.style.top=Math.floor(this.place.y)+'px';		
	}
}

function DropClass(){

	function newplace(a){
		var i=0;
		var p=objs[a].place;
		var q;
		for(i=0;i<=maxi;i++){
			if(i!=a){
				q=objs[i].place;
				// repulsion
				if(p.distance(q)!=0){
					p.add((p.from(q)).inv().mult(40)); // repulse by 1/d*X
					//p.add(p.unifrom(q)); // repulse by one
				}
			}			
		}

		// attraction
		k=a+1; if(k>maxi){ k-=maxi; }
		p.add(objs[k].place.unifrom(p));

		k=a+2; if(k>maxi){ k-=maxi; }
		p.add(objs[k].place.unifrom(p));

		k=a+3; if(k>maxi){ k-=maxi; }
		p.add(objs[k].place.unifrom(p));
		
	}

// 6 drops, attract +1 and +2; repuls 40
	
	function movedrops(){
		var j;
		var outd=0;
		for(j=1;j<=maxi;j++){
			newplace(j);
			if(objs[j].place.x<0 || objs[j].place.x>maxp ||
				objs[j].place.y<0 || objs[j].place.y>maxp){ outd+=1; }
		}
		if(outd>7){ randomize(); }
		for(j=1;j<=maxi;j++){
			objs[j].go();
		}
		needmouse=true;
	}
	
	function randomize(){
		var i;
		for(i=1;i<=maxi;i++){
			objs[i].place.x=Math.floor(Math.random()*maxp);
			objs[i].place.y=Math.floor(Math.random()*maxp);
		}
	}
	
	function storemouse(e) {
		if(needmouse){
			var posx = 0;
			var posy = 0;
			if (!e) var e = window.event;
			if (e.pageX || e.pageY) 	{
				posx = e.pageX;
				posy = e.pageY;
			}
			else if (e.clientX || e.clientY) 	{
				posx = e.clientX + document.body.scrollLeft
					+ document.documentElement.scrollLeft;
				posy = e.clientY + document.body.scrollTop
					+ document.documentElement.scrollTop;
			}
			// posx and posy contain the mouse position relative to the document
			// Do something with this information
			objs[0].place.x=posx-13;
			objs[0].place.y=posy-13;
			objs[0].place.add(tablepl);
			needmouse=false;
		}
	}
	
	function storetable(){
		var obj=document.getElementById('droptable');
		var curleft = curtop = 0;
		do{
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
		tablepl.x=-curleft;
		tablepl.y=-curtop;
	}

	var needmouse=true;
	document.body.onmousemove=storemouse;
	var tablepl=new PlaceClass(0,0);
	storetable();
	
	var objs=new Array();
	var maxp=398; // max placement for random
	var maxi=8;
	for(i=1;i<=maxi;i++){
		objs[i]=new OneDropClass(i,maxp);
	}
	objs[0]=new Object;
	objs[0].place=new PlaceClass(0,0); // mouse place
	window.setInterval(movedrops,10);
	//window.setInterval(randomize,40000);
	
}
