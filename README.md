# Google map
React Google Map

How to use it : 

```import Gmap from 'path/Gmap/Gmap';```

```<Gmap items={this.state.items} ```
```filterByPosition={(lat,lng) => this.filterByposition(lat,lng)} ```
```updateItems={this.state.updateItems} ```
```refreshItems={(swLat,swLng,neLat,neLng) => this.refreshItems(swLat,swLng,neLat,neLng)}/>```


``` updateItems ``` is a boolean who needs to be passed at true if you want to update your items 

``` filterByPosition(lat,lng) ``` is a function if you want to refresh your items when the user uses the geolocation or the search field.

``` refreshItems(swLat,swLng,neLat,neLng) ``` is a function to update the items according the view of the google map.


In the Style.js, you can custom the style of your google map.

At the beginning of the Gmap.js, there is a config const with some parameters which allows the configuration of the map.
