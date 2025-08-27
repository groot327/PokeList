# PokeList

## Purpose

The idea for this page is the result of a conversation with a Pokémon Ambassador in 2025.

The idea is to allow the user to keep track the Shiny, XXL, XXS, and 100% IV (Hundo) Pokémon they have collected in the Pokémon GO game.

## The details

As part of the page, all data is saved to the browser's localStorage, 
meaning that as long as the browser cache is not cleared, status should be saved. 

More information is available below in the **How to use this page** section

The project will be updated from time to time as needs arise. 
This includes new images, Pokémon forms, and generations, should they become available.

# How to use this page

Let's take a look at the functionality available on the page. 

## Main Tabs

There are four main tabs on the page: Shiny, XXL, XXS, Hundo. This page helps the user
keep track of those Pokémon they have, and those they need. 

* _**Shiny**_ - A page of all the **SHINY** Pokémon, and all their forms and costumes.

* _**XXL**_ - Along with **SHINY**, **XXL** is one of the types recorded in the Pokedex,
and required if the user is going to complete the "**Dex**".

* _**XXS**_ - Like **XXL**, **XXS** is required to _complete_ the **Dex**. Between the 
**XXS** and **XXL**, the collections can be very difficult to complete. 

* _**Hundo**_ - The Holy Grail of Pokémon! Beside the **SHINY** Pokémon, the **HUNDO**
is what everyone wants in this game! 

## Generation Tabs

There are currently nine generations of Pokémon currently available in Pokemon GO.
The number of active Pokémon in the game is >1025, so navigating through the tabs, 
listed in the previous section, can be tedious. To help alleviate some of the scrolling, 
tabs for each generation have been provided under the main tabs. These generation tabs
allow for a jump to the generation but do not stay highlighted, as they are simply jump
points.

## Individual Pokémon Cells

As mentioned above, the intent of this page is to help the user complete their **Dex**,
and promote trading by sharing "wants" and "needs". To that end, the cells on this page
provide a clickable means to visualize the collection. 

* Each Pokémon gets its own cell on each tab on the page. 
* Each cell (Pokémon) has four states: Grey (default), Yellow, Blue, and Red. 
* These "states" can mean whatever the user wants them to mean.
* The clicked state of each cell is separate for each of the four tabs discussed above. 
* The states are saved in the browser for later recall, sharing and edits (see next section).

## Slide Out Menu

There is a slide-out menu on the left of the page, activated with the hamburger icon 
in the upper left corner of the page. On that menu are a number of buttons, explained 
here. 

* _**Share**_ - This button allows the user to save one of the filters with the associated
cell selections. This button will create a "short URL" that can be shared with others for 
potential trading, etc. Note that this "sharing" option is read only for anyone using the 
URL. This is the only non-destructive save or sharing option available, and it's safe for 
sharing with others. 

* _**Save**_ - To making the save more permanent, the "Save" button will create a very
long URL that, when accessed, will load the contents of the URL, replacing whatever is
currently saved in the browser. This is helpful for point-in-time saves or quick transfers
between browsers. This **is** a destructive URL and will replace current contents. 

* _**Clear**_ - Simple, but destructive, clearing of all data currently in the browser. 
Allows for a clean start in case where this is needed. Imagine having to "unclick" 
potentially hundreds of cells to start over! This is the safety net for that situation. 

* _**Export**_ and _**Import**_ - These buttons are another more permanent way to allow 
the user to save their configuration and import it elsewhere. This method is the best and
safest way to create a safe of the data. The JSON file will be downloaded to the user's
device to be available for "import" to other browsers, or sent to other devices for use
elsewhere. 

## Upcoming Work

1. continue to search for missing images
2. expand this readme with page "help" information in prep for adding it to the page

## History

* 2025-07-31: there are some images that have yet to be found; we expect to find them soon.
* 2025-08-07: pushed good latest code to github; some image issues remain.
* 2025-08-08: code should be pretty solid; updated html with favicon.ico link.
* 2025-08-26: latest code push includes the share process, finalized.

## Notice:

* Pokémon data is copyrighted by The Pokémon Company.
* This dataset is a fan page for non-commercial use only.
* Data sourced from user-provided files and Pokémon GO event information.
