import React, { Component } from 'react';
import PropTypes from 'prop-types';

import scriptLoader from 'react-async-script-loader';

import './Gmap.css';

import {styles} from './Styles';

import Marker from './marker.svg';

// Map options
const options = {
  center:{lat: 48.856614, lng: 2.3522219000000177},
  zoom:5,
  zoomControl:true,
  mapTypeControl:false,
  scaleControl:true,
  streetViewControl:false,
  rotateControl:false,
  fullscreenControl:false
}

// Configuration
const config = {
	marker:{
		center:true, // Center the map on the marker if we click on it
		zoomLevel:0, // The level of the zoom when we click on it
		infowindow:true,
		event:'click', // Choose an event to display the infowindow
		icon:{
            url:Marker,
            height:48,
            width:36,
        }
	},
	markers:{
		cluster:false, // Group the markers
		maxZoom:10,
		gridSize:50,
		ignoreHidden:true,
		optimized:false,
		animation:false
	},
	clusterStyles:[{
        url:Marker,
        height:48,
        width:36,
        textColor:'black',
        textSize:14
    }],
    // Center map on markers
    bounds:{
	    onlyFirstTime:true,
	    always:false,
	    zoomLevel:10,
   	},
	geoloc:false, // If true, the geoloc is proposed immediately when the map is loaded
	user:{ 
		center:true, // Center the map on the user
		zoomLevel:10, // Level of zoom
		icon:true, // Create a marker
		iconStyle:{
		    url:Marker,
		    size:null,
		    origin:null,
		    anchor:null
	   	},
	   	title:"Votre position",
		optimized:false,
		animation:false,
		centerWithMarker:false,
		centerWithNearestMarker:true
	},
	search:{
		searchField:true,
		id:'autocomplete',
		centerWithMarker:false,
		centerWithNearestMarker:true,
		zoomLevel:10
	}
}

class Gmap extends Component {

	constructor(props){
		super(props);
		this.state = {
			items:this.props.items ? this.props.items : null
		}
		this.map = null;
		this.gmap = null;
		this.infoWindow = null;
		this.loaded = false;
		this.marker = null;
		this.markersID = [];
		this.markers = [];
		this.markerCluster = null;
		this.bounds = null;
	}

	isEquivalent(a, b) {
	    if (a.length !== b.length) {
     	    return false;
     	}
     	for (var i = 0; i < a.length; i++) {
	     	if (a.id !== b.id) {
	             return false;
	     	}
 		}
 		return true;
  	}

	componentWillReceiveProps(nextProps, nextState){

		let isEquivalent = this.isEquivalent(nextProps.items, this.state.items);

		// As soon as the script is loaded we create the map
		if(nextProps.isScriptLoaded && nextProps.isScriptLoadSucceed && !this.loaded){
			this.createMap();
			this.loaded = true;
		}
		
		// If items are updated
		else if(this.loaded && nextProps.updateItems && !isEquivalent){
			this.setState({
				items:nextProps.items
			});

			this.addMarkers(nextProps.items);

			if(!nextProps.refreshItems && config.bounds.onlyFirstTime){
				this.gmap.fitBounds(this.bounds);
				if(nextProps.items.length === 1){
		        	this.gmap.setZoom(config.bounds.zoomLevel);
		        }
			}
		}
	}

	createMap(){

		// Create Map
		this.map = new window.google.maps.Map(document.getElementById('map'), options);

		// Custom styles
		if(styles){
			let styledMap = new window.google.maps.StyledMapType(styles, {name: "Gmap custom"});
			this.map.mapTypes.set('map_style', styledMap);
	    	this.map.setMapTypeId('map_style');
		}
		
		this.gmap = this.map;

		// Add Markers on map
		this.addMarkers(this.state.items);

		// Center map on markers when map is loaded
		if(config.bounds.onlyFirstTime){
			this.gmap.fitBounds(this.bounds);
		}

		// Geolocalisation 
		if(config.geoloc){
			this.geoloc();
		}
		// Field Search
		if(config.search.searchField){
			this.searchField();
		}
		// Refresh marker when you move the map
		if(this.props.refreshItems){
			this.fetchPlace();
		}
	}

	addMarkers(items){

		// Clear markers
		this.clearMarkers(items);

		this.bounds = new window.google.maps.LatLngBounds();

		// We create the markers
		items.map((item, i) => {
			
			this.createMarker(item);

			if(this.marker){

				// Markers for cluster
				this.markers.push(this.marker);

				// Add marker on map
	      		if(this.bounds.contains(this.marker.getPosition()) === true){
					this.markers[i].setMap(this.gmap);

					this.markersID.push(item.id);

					// Add the infowindow
					if(config.marker.infowindow){
						this.addInfoWindow(this.marker, item);
					}
	      		}

	      	}

      	});

		// Center map on markers every time markers are updated
		if(config.bounds.always){
			this.gmap.fitBounds(this.bounds);
		}

		// Group marker
      	if(config.markers.cluster && this.markers){
      		this.markerCluster = new window.MarkerClusterer(this.gmap, this.markers,{
      			ignoreHidden:config.markers.ignoreHidden,
      			maxZoom:config.markers.maxZoom,
            	gridSize:config.markers.gridSize,
            	styles:config.clusterStyles
      		});
      	}	
	}

	createMarker(item){
		const Latlng = new window.google.maps.LatLng(item.lat,item.lng);
		this.bounds.extend(Latlng);
		return this.marker = new window.google.maps.Marker({
					id:item.id,
	      			position:Latlng, 
	      			title:item.name ? item.name : null,
	      			icon:config.marker.icon ? config.marker.icon : null,
	      			optimized:config.marker.optimized,
	      			animation:config.marker.animation ? window.google.maps.Animation.DROP : null
	      		});
	}

	addInfoWindow(marker, item){

		// Template infowindow
		const infoWindowTemplate = `
	      <div class="info-window">
	        <h4>${item.name ? item.name : null}</h4>
	      </div>
	    `;

	    // Create infowindow
	    const infoWindow = new window.google.maps.InfoWindow({content:infoWindowTemplate});

	    // Add event onClick on Marker
		marker.addListener(config.marker.event, () => { 
			this.closeInfoWindow();
			this.infoWindow = infoWindow;

			if(config.marker.center){
				this.gmap.panTo(marker.getPosition());
			}
			if(config.marker.zoomLevel){
				this.gmap.setZoom(config.marker.zoomLevel);
			}

  			infoWindow.open(this.map, marker);
  		});
	}

	clearMarkers(newItems) {
		if(!newItems.length){
			this.clearAllMarkers();
			return;
		}
	    if(this.markers.length){

	    	let tabID = this.markersID;
	    	
	    	for(let i in newItems){
	    		let index = tabID.indexOf(newItems[i].id);
	    		if(index !== -1){
	    			tabID.splice(index, 1)
	    		}
	    	}
	    	
	    	// Remove markers from map
	    	for(let i in this.markers){
	    		if(tabID.indexOf(this.markers[i].id) !== -1){
	    			this.markers[i].setMap(null);
	    			if(this.markerCluster){
	    				this.markerCluster.removeMarker(this.markers[i]);
	    			}
	    		}
	    	}

		  	this.markers = [];
		  	this.markersID = [];
	    	this.marker = null;
	    }
	}

	clearAllMarkers(){
		if(this.markerCluster){
			this.markerCluster.clearMarkers();
		}
    	if(this.markers.length){
	    	for (let i in this.markers) {
	    		this.markers[i].setMap(null);
	    	}
	    }
	    this.markers = [];
	  	this.markersID = [];
    	this.marker = null;
	}

	closeInfoWindow(){
		if(this.infoWindow){
			this.infoWindow.close();
		}
	}

	searchField(){

		let input = document.getElementById(config.search.id); // Get the search field
		if(input){

			const self = this;

			let autocomplete = new window.google.maps.places.Autocomplete(input);
		    autocomplete.bindTo('bounds', self.gmap);

		    autocomplete.addListener('place_changed', function() {

				let place = autocomplete.getPlace();
				if(!place.name.trim()){
					return;
				}
				if (!place.geometry) {
					window.alert("Pas de résultat pour: '" + place.name + "'");
					return;
				}
				if (place.geometry.viewport) {

					let center = new window.google.maps.LatLngBounds();
					let pos = place.geometry.location;

					if(self.props.filterByPosition){
						self.props.filterByPosition(place.geometry.location.lat(), place.geometry.location.lng());
					}

					// Center with the nearest marker
					if(config.search.centerWithNearestMarker){
						let nearest = self.find_closest_marker(place.geometry.location.lat(), place.geometry.location.lng());
						center.extend(pos);
						center.extend(nearest.position);
						self.gmap.fitBounds(center);
					}	
					// Center with all the markers
					else if(config.search.centerWithMarker){
						self.bounds.extend(pos);
            			self.gmap.fitBounds(self.bounds);
					}
					else{
		            	self.gmap.panTo(pos);
			            // Zoom on the position
			            if(config.search.zoomLevel){
							self.gmap.setZoom(config.search.zoomLevel);
						}
		            }

				} 
				else {
					self.gmap.setCenter(place.geometry.location);
					self.gmap.setZoom(10);
				}
		    });
		}
	}

	geoloc(){

		const self = this;

		// Try HTML5 geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {

            let posUser = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };

            if(self.props.filterByPosition){
				self.props.filterByPosition(position.coords.latitude, position.coords.longitude);
			}

            // Center with the nearest marker
            if(config.user.centerWithNearestMarker){
            	let centerUser = new window.google.maps.LatLngBounds();
            	let nearest = self.find_closest_marker(position.coords.latitude, position.coords.longitude);
            	centerUser.extend(posUser);
		        centerUser.extend(nearest.position);
		        self.gmap.fitBounds(centerUser);
            }
            // Center with all markers
            else if(config.user.centerWithMarker){
            	self.bounds.extend(posUser);
            	self.gmap.fitBounds(self.bounds);
            }
            else{
            	self.gmap.panTo(posUser);
	            // Zoom on the position
	            if(config.user.zoomLevel){
					self.gmap.setZoom(config.user.zoomLevel);
				}
            }
            
			// Create marker for the user
			if(config.user.icon){

				let icon = {
				    url:config.user.iconStyle.url ? config.user.iconStyle.url : null,
				    size:config.user.iconStyle.size ? new window.google.maps.Size(config.user.iconStyle.size[0], config.user.iconStyle.size[1]) : null,
				    origin:config.user.iconStyle.origin ? new window.google.maps.Point(config.user.iconStyle.origin[0], config.user.iconStyle.origin[1]) : null,
				    anchor:config.user.iconStyle.anchor ? new window.google.maps.Point(config.user.iconStyle.anchor[0], config.user.iconStyle.anchor[1]) : null
			   	};

				const markerUser = new window.google.maps.Marker({
	      			position:posUser, 
	      			title:config.user.title ? config.user.title : null,
	      			map:self.gmap,
	      			icon:icon.url ? icon : null,
	      			optimized:config.user.optimized,
	      			animation:config.user.animation ? window.google.maps.Animation.DROP : null
	      		})
			}

          }, function() {
            alert('We cannot get your position');
          });
        } else {
          // Browser doesn't support Geolocation
          alert('Your browser do not support geolocation');
        }
	}

	rad(x) {
		return x*Math.PI/180;
	}

	find_closest_marker( lat, lng ) {
	    var R = 6371; // radius of earth in km
	    var distances = [];
	    var closest = -1;
	    for(let i=0;i< this.markers.length; i++ ) {
	        var mlat = this.markers[i].position.lat();
	        var mlng = this.markers[i].position.lng();
	        var dLat  = this.rad(mlat - lat);
	        var dLong = this.rad(mlng - lng);
	        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	            Math.cos(this.rad(lat)) * Math.cos(this.rad(lat)) * Math.sin(dLong/2) * Math.sin(dLong/2);
	        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	        var d = R * c;
	        distances[i] = d;
	        if ( closest == -1 || d < distances[closest] ) {
	            closest = i;
	        }
	    }
	    return this.markers[closest];
	}

	fetchPlace(){
		const self = this;
		window.google.maps.event.addListener(self.gmap, 'idle', function() {

			// First, determine the map bounds
			let bounds = self.gmap.getBounds();

			// Then the points
			let swPoint = bounds.getSouthWest();
		 	let nePoint = bounds.getNorthEast();

		 	// Now, each individual coordinate
		    let swLat = swPoint.lat();
		    let swLng = swPoint.lng();
		    let neLat = nePoint.lat();
		    let neLng = nePoint.lng();

		    self.props.refreshItems(swLat,swLng,neLat,neLng);

		});
	}

	render() {
		return(
			<div className="Gmap">

				<button onClick={() => this.geoloc()}>Geolocalisation</button>

				<input id="autocomplete" placeholder="Rechercher une adresse" type="text"></input>

				<div id="map" ref={(map) => { this.map = map; }}>
				Loading Map...
				</div>

			</div>
		)
		
	}

}

export default scriptLoader(
	[
		'https://maps.googleapis.com/maps/api/js?key=AIzaSyARNJGnT1y9Nm_e6axdUCP2q9tDG4EkB_I&libraries=places',
		'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js'
	]
)(Gmap);


Gmap.defaultProps = {
	items:[],
	refreshItems:null,
	filterByPosition:null
};

Gmap.contextTypes = {
  items:PropTypes.array,
  refreshItems:PropTypes.func,
  filterByPosition:PropTypes.func
};
