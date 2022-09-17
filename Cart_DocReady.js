/* -------------------------------------------------------------------------------

BSD 3-Clause License

Copyright (c) 2019, Filmote and Mr.Blinky
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

------------------------------------------------------------------------------- */

// V1.28
var categoryDialog;
var uploadDialog;
var uploadHEXDialog;
var errorDialog;
var whatNext;
var infoPanel;
var infoLIID;
var eepromClashes;

// -------------------------------------------------------------------------------------------
//  Category Name
// -------------------------------------------------------------------------------------------

function SortByStart(a, b){
    
    var aStart = a.start.toLowerCase();
    var bStart = b.start.toLowerCase(); 

    if (aStart == "na") aStart = "9999";
    if (bStart == "na") bStart = "9999";
    if (aStart == "")   { aStart = "9999"; a.start = "na"; }
    if (bStart == "")   { bStart = "9999"; b.start = "na"; }
    
    return (parseInt(aStart) < parseInt(bStart) ? -1 : ((parseInt(aStart) > parseInt(bStart)) ? 1 : 0));

}

$(document).ready(function () {



    // -------------------------------------------------------------------------------------------
    //  Category Name

    $(function () {

        var form,
            name = $("#categoryName"),
            allFields = $([]).add(name),
            tips = $(".validateTips");

        function addCategory() {

            event.preventDefault();
            var valid = true;
            var $categoryName = $('#categoryName').val().trim();

            allFields.removeClass("ui-state-error");

            valid = valid && checkLength(tips, name, "category name", 1, 99);
            valid = valid && checkRegexp(tips, name, /^[a-z](.)*$/i, "Category names must begin with a letter.");

            var pos = cats.map(function (e) {
                return e.name.toLowerCase();
            }).indexOf($categoryName.toLowerCase());

            if (pos >= 0) {
                name.addClass("ui-state-error");
                updateTips(tips, "Category name already in use.");
                valid = false;
            }

            if (valid) {

                var $guid = $('#guid').val();

                $.post("Cart_CreateCSV.php",
                    {
                        categoryName: $categoryName,
                        guid: $guid,
                        mode: "createCategory"
                    },
                    function (data) {

                        $("#dvCategories").append(generateCatImage($categoryName, "temp/" + $guid + ".png"));
                        var cat = { name: $categoryName, screen: "temp/" + $guid + ".png", hex: "", data: "", save: "" };
                        cats.push(cat);
                        $('#categoryName').val("");

                    }

                );

                categoryDialog.dialog("close");

            }
            return valid;
        }

        categoryDialog = $("#dlgCatergory").dialog({
            autoOpen: false,
            height: "auto",
            width: 380,
            modal: true,
            open: function (event, ui) {
                $('#guid').val(generateGUID());
                $('#dlgCatergory').css('overflow', 'hidden'); //this line does the actual hiding
            },
            buttons: {
                "Create": addCategory,
                Cancel: function () {
                    categoryDialog.dialog("close");
                }
            },
            close: function () {
                form[0].reset();
                allFields.removeClass("ui-state-error");
            }
        });

        form = categoryDialog.find("form").on("submit", function (event) {
            event.preventDefault();
            addCategory();
        });

    });


    // -------------------------------------------------------------------------------------------
    //  CSV File Upload

    $(function () {
        var form,
            name = $("#fileName"),
            allFields = $([]).add(name),
            tips = $(".validateTips");

        function uploadFile() {

            event.preventDefault();
            var valid = true;
            allFields.removeClass("ui-state-error");

            if (typeof $('#fileName')[0].files[0] === 'undefined') {
                name.addClass("ui-state-error");
                updateTips(tips, "Please select a CSV file to upload.");
                valid = false;
            }


            // CSV file is mandatory and must be between < 20K, have a mime type of "text/csv" and an extension of .csv ..

            if (valid) {

                var size = $('#fileName')[0].files[0].size;
                var mime = $('#fileName')[0].files[0].type;
                var extension = $('#fileName').val().replace(/^.*\./, '');

                if (size > 131072 || (mime != "text/csv" && mime != "application/vnd.ms-excel") || extension != "csv") {
                    name.addClass("ui-state-error");
                    updateTips(tips, "Invalid CSV file selected.");
                    valid = false;
                }

            }

            if (valid) {

                var $guid = $('#guid').val();
                var formData = new FormData($("#frmUploadCSVForm")[0]);

                $.ajax({

                    url: "./Cart_UploadCSV.php",
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,

                }).done(function (data) {

                    uploadDialog.dialog("close");

                    if (data.substr(0,12) != "Invalid File") {

                        var url = String(window.location);
                        var session_id = /SESS\w*ID=([^;]+)/i.test(document.cookie) ? RegExp.$1 : false;
                        if (url.indexOf("?") != -1) {
                            url = url.substring(0, url.indexOf("?")) + "?file=temp/" + session_id + ".csv";
                        }
                        else {
                            url = url + "?file=temp/" + session_id + ".csv";
                        }
                        window.location.replace(url);

                    }
                    else {

                        $('#errorMessage').text("CSV file error:" +data.substr(12));
                        errorDialog.dialog("open");

                    }

                }).fail(function () {

                    uploadDialog.dialog("close");
                    $('#errorMessage').text("An error occurred, the files couldn't be sent!");
                    errorDialog.dialog("open");

                });

            }
            return valid;
        }

        uploadDialog = $("#dlgUploadCSV").dialog({
            autoOpen: false,
            height: "auto",
            width: 460,
            modal: true,
            open: function (event, ui) {
                var t = $('#guid');
                $('#guid').val(generateGUID());
                $('#dlgUploadCSV').css('overflow', 'hidden'); //this line does the actual hiding
            },
            buttons: {
                "Upload": uploadFile,
                Cancel: function () {
                    uploadDialog.dialog("close");
                }
            },
            close: function () {
                form[0].reset();
                allFields.removeClass("ui-state-error");
            }
        });

        form = uploadDialog.find("form").on("submit", function (event) {
            event.preventDefault();
            uploadFile();
        });

    });


    // -------------------------------------------------------------------------------------------
    //  Hex File Upload

    $(function () {
        var form,
            name = $("#gameTitle"),
            version = $("#versionNumber"),
            developer = $("#developerName"),
            fileName = $("#hexName"),
            graphicName = $("#graphicName"),
            dataName = $("#dataName"),
            saveName = $("#saveName"),
            description = $("#description"),
            addToRepo = $("#addToRepo"),

            start = $("#start"),
            end = $("#end"),
            hash = $("#hash"),

            allFields = $([]).add(name).add(fileName).add(graphicName).add(version).add(developer).add(description).add(addToRepo).add(start).add(end).add(hash),
            tips = $(".validateTips");

        function uploadFile() {

            event.preventDefault();
            var valid = true;
            allFields.removeClass("ui-state-error");

            // Get optional game info

            var $gameTitle = $('#gameTitle').val();
            var $versionNumber = $('#versionNumber').val();
            var $developerName = $('#developerName').val();
            var $descriptionVal = $('#description').val();

            var $start = $('#start').val();
            var $end = $('#end').val();
            var $hash = $('#hash').val();


            // Hex file is mandatory and must be between < 85K, have no mime type and an extension of .hex ..

            if (typeof $('#hexName')[0].files[0] === 'undefined') {
                fileName.addClass("ui-state-error");
                updateTips(tips, "Please select a HEX file to upload.");
                valid = false;
            }

            if (valid) {

                var size = $('#hexName')[0].files[0].size;
                var mime = $('#hexName')[0].files[0].type;
                var extension = $('#hexName').val().replace(/^.*\./, '');

                if (size > 85000 || mime != "" || extension != "hex") { // mime application/octet-stream
                    fileName.addClass("ui-state-error");
                    updateTips(tips, "Invalid HEX file selected.");
                    valid = false;
                }

            }


            // Graphics file is mandatory and must be between < 10K, have a mime type of 'image/png' and an extension of .png ..

            if (valid && typeof $('#graphicName')[0].files[0] == "undefined") {
                graphicName.addClass("ui-state-error");
                updateTips(tips, "Please select a PNG file to upload.");
                valid = false;
            }

            if (valid) {

                var size = $('#graphicName')[0].files[0].size;
                var mime = $('#graphicName')[0].files[0].type;
                var extension = $('#graphicName').val().replace(/^.*\./, '');

                if (size > 10000 || (mime != "image/png" && mime != "") || extension != "png") {
                    graphicName.addClass("ui-state-error");
                    updateTips(tips, "Invalid PNG file selected.");
                    valid = false;
                }

            }


            // Data file is not mandatory and must be between < 100K, have no mime type and an extension of .bin ..

            if (typeof $('#dataName')[0].files[0] !== 'undefined') {

                if (valid) {

                    var size = $('#dataName')[0].files[0].size;
                    var mime = $('#dataName')[0].files[0].type;
                    var extension = $('#dataName').val().replace(/^.*\./, '');

                    if (size > 100000 || extension != "bin") { // mime application/octet-stream
                        dataName.addClass("ui-state-error");
                        updateTips(tips, "Invalid data file selected.");
                        valid = false;
                    }

                }

            }


            // Save file is not mandatory and must be between < 100K, have no mime type and an extension of .bin ..

            if (typeof $('#saveName')[0].files[0] !== 'undefined') {

                if (valid) {

                    var size = $('#saveName')[0].files[0].size;
                    var mime = $('#saveName')[0].files[0].type;
                    var extension = $('#saveName').val().replace(/^.*\./, '');

                    if (size > 100000 || extension != "bin") { // mime application/octet-stream
                        saveName.addClass("ui-state-error");
                        updateTips(tips, "Invalid save file selected.");
                        valid = false;
                    }

                }

            }

            if ($descriptionVal.match(/[^a-zA-Z0-9 \.!-']/g)) {
                description.addClass("ui-state-error");
                updateTips(tips, "Please use only alphanumeric letters.");
                valid = false;
            }

            if ($start != "") {

                if (parseInt($start) != $start) {
                    start.addClass("ui-state-error");
                    updateTips(tips, "EEPROM start address must be an integer.");
                    valid = false;
                }

                else if (parseInt($start) < 16 || parseInt($start) > 1023) {
                    start.addClass("ui-state-error");
                    updateTips(tips, "EEPROM start address must be an between 16 and 1023.");
                    valid = false;
                }

            }


            if ($end != "") {

                if ($start == "") {
                    start.addClass("ui-state-error");
                    updateTips(tips, "EEPROM start and end addresses must be entered.");
                    valid = false;
                }

                else if (parseInt($end) != $end) {
                    end.addClass("ui-state-error");
                    updateTips(tips, "EEPROM end address must be an integer.");
                    valid = false;
                }

                else if (parseInt($end) < 16 || parseInt($end) > 1023) {
                    end.addClass("ui-state-error");
                    updateTips(tips, "EEPROM end address must be an between 16 and 1023.");
                    valid = false;
                }

            }

            // If the files are valid then upload them ..

            if (valid) {

                var $guid = $('#guid').val();
                var formData = new FormData($("#frmUploadHEXForm")[0]);
                var addToRepoChecked = document.getElementById('addToRepo').checked;
                
                var dataNameContent = $('#dataName')[0].files[0]
                var saveNameContent = $('#saveName')[0].files[0]

                $.ajax({
                    url: "./Cart_UploadHEX.php",
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,

                }).done(function (data) {

                    uploadHEXDialog.dialog("close");


                    // If an error occurred display a message ..

                    if (data.substring(0, 5) == "ERR: ") {

                        $('#errorMessage').text(data.substring(5, 99999));
                        errorDialog.dialog("open");

                    }


                    // Otherwise add the new game to the 'unused' list ..

                    else {

                        var newIndex = items.length + 1;
                        var baseFileName = data.substring(9, 99999);
                        html = '<li id="li' + newIndex + '"><img class="game" onclick="openInfo(' + newIndex + ');" src="' + (addToRepoChecked ? 'upload/' : 'temp/') + baseFileName + '.png" /></li>';
                        $('#dvUnused').append(html);

                        // Add game details to global collection..

                        var dataFile = "";
                        var saveFile = "";

                        if (typeof dataNameContent !== 'undefined') {

                            dataFile = baseFileName + "_1.bin";

                        }

                        if (typeof saveNameContent !== 'undefined') {

                            saveFile = baseFileName + "_2.bin";

                        }

                        if ($gameTitle == "") {

                            $gameTitle = baseFileName;
                        }

                        if ($start == "") {
                            $start = "na";
                            $end = "na";
                            $hash = "na";
                        }

                        if (addToRepoChecked) {
                            var item = { name: $gameTitle, screen: "upload/" + baseFileName + ".png", hex: "upload/" + baseFileName + ".hex", data: "upload/" + dataFile, save: "upload/" + saveFile, version: $versionNumber, developer: $developerName, info: $descriptionVal, start: $start, end: $end, hash: $hash };
                            items.push(item);
                        }
                        else {
                            var item = { name: $gameTitle, screen: "temp/" + baseFileName + ".png", hex: "temp/" + baseFileName + ".hex", data: "temp/" + dataFile, save: "temp/" + saveFile, version: $versionNumber, developer: $developerName, info: $descriptionVal, start: $start, end: $end, hash: $hash };
                            items.push(item);
                        }

                    }

                }).fail(function () {

                    uploadHEXDialog.dialog("close");
                    $('#errorMessage').text("An error occurred, the files couldn't be sent!");
                    errorDialog.dialog("open");

                });

            }
            return valid;
        }
        
        function triggerArduboySelect() {

            arduboyFileInput.dispatchEvent(new MouseEvent("click"));

        }

        uploadHEXDialog = $("#dlgUploadHEX").dialog({
            autoOpen: false,
            height: "auto",
            width: 460,
            modal: true,
            open: function (event, ui) {
                var t = $('#guid');
                $('#guid').val(generateGUID());
                $('#dlgUploadHEX').css('overflow', 'hidden'); //this line does the actual hiding
                $('.ui-dialog-buttonpane').find('button:contains(".arduboy")').addClass('shiftLeft');
            },
            buttons: {
                "Load .arduboy": triggerArduboySelect,
                "Upload": uploadFile,
                Cancel: function () {
                    uploadHEXDialog.dialog("close");
                }
            },
            close: function () {
                form[0].reset();
                allFields.removeClass("ui-state-error");
            }
        });

        form = uploadHEXDialog.find("form").on("submit", function (event) {
            event.preventDefault();
            uploadFile();
        });

    });


    // -------------------------------------------------------------------------------------------
    //  Error Dialogue

    errorDialog = $( "#dlgErrorMessage" ).dialog({
        autoOpen: false,
        modal: true,
        height: "auto",
        width: 380,
        buttons: {
        Ok: function() {
            $( this ).dialog( "close" );
        }
        }
    });


    // -------------------------------------------------------------------------------------------
    //  EEPROM Clashes Dialogue

    eepromClashes = $( "#dlgEEPROMClashes" ).dialog({
        autoOpen: false,
        modal: true,
        height: "auto",
        width: "1300px",
        buttons: {
            Ok: function() {
                $( this ).dialog( "close" );
            }
            }
    });


    // -------------------------------------------------------------------------------------------
    //  What Next Dialogue

    whatNext = $( "#dlgWhatNext" ).dialog({
        autoOpen: false,
        modal: true,
        height: "auto",
        width: "665px",
        buttons: {
            Ok: function() {
                $( this ).dialog( "close" );
            }
            }
    });


    // -------------------------------------------------------------------------------------------
    //  Info Panel

    infoPanel = $( "#dlgInfoPanel" ).dialog({
        autoOpen: false,
        modal: true,
        height: "auto",
        width: "544px",
        buttons: {
        Ok: function() {
            $( this ).dialog( "close" );
        }
        }
    });
    

  // -------------------------------------------------------------------------------------------
    // Read the cart file and create the table ..

    var fileName = "./flashcart-index.csv";
    fullList = "./flashcart-index.csv";
    extraCats = "";

    let searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has('file')) {
        fileName = searchParams.get('file');
    }

    if (searchParams.has('list')) {
        fullList = "./" + searchParams.get('list');
    }
    
    if (searchParams.has('extraCats')) {
        extraCats = "./" + searchParams.get('extraCats');
    }

    if (fileName == "./flashcart-index.csv") {

        if (fullList == "./flashcart-index.csv") {
            fullList = "";
        }
        else if (fullList != "") {
            fileName = fullList;
        }

    }

    $.ajax({

        type: "GET",
        url: fileName,
        dataType: "text",

        success: function (response) {

            var options = {"separator" : ";"};

            urldata = response.replace(/\\/g, "/");
            csvdata = $.csv.toArrays(urldata, options);
            generateHtmlTable(csvdata);

            if (typeof extraCats !== "undefined" && extraCats != "") {
                    
                $.ajax({

                    type: "GET",
                    url: extraCats,
                    dataType: "text",

                    success: function (response) {

                        var options = {"separator" : ";"};

                        urldata = response.replace(/\\/g, "/");
                        csvdata = $.csv.toArrays(urldata, options);
                        generateExtraCats(csvdata);
                        resizeColumnHeights();

                    }

                });

            }
            
            if (typeof fullList !== "undefined" && fullList != "") {

                $.ajax({

                    type: "GET",
                    url: fullList,
                    dataType: "text",

                    success: function (response) {

                        var options = {"separator" : ";"};

                        urldata = response.replace(/\\/g, "/");
                        csvdata = $.csv.toArrays(urldata, options);
                        generateHtmlTable_FullList(csvdata);


                        // Connect the events after the HTML table has been rendered ..

                        $("#btnCreateCategory").on("click", function ()     { categoryDialog.dialog("open"); });
                        $("#btnCreateCategory2").on("click", function ()    { categoryDialog.dialog("open"); });
                        $("#btnUploadFile").on("click", function ()         { uploadDialog.dialog("open"); });
                        $("#btnUploadHEXFile").on("click", function ()      { uploadHEXDialog.dialog("open"); });
                        $("#btnUploadHEXFile2").on("click", function ()     { uploadHEXDialog.dialog("open"); });

                        resizeColumnHeights();

                    }

                });

            }
            else {

                $("#btnCreateCategory").on("click", function ()     { categoryDialog.dialog("open"); });
                $("#btnCreateCategory2").on("click", function ()    { categoryDialog.dialog("open"); });
                $("#btnUploadFile").on("click", function ()         { uploadDialog.dialog("open"); });
                $("#btnUploadHEXFile").on("click", function ()      { uploadHEXDialog.dialog("open"); });
                $("#btnUploadHEXFile2").on("click", function ()     { uploadHEXDialog.dialog("open"); });

                resizeColumnHeights();

            }

            $('#btnGetData').click(function () {

                var colCount = $("#tab").find("tr:first th").length;

                if (allHeadersOK(colCount)) {

                    $('#output').val(createCSV(colCount));
                    $('#mode').val('csv');
                    $("#cartForm").submit();

                }

            });

            $('#btnAddCol').click(function () {

                catCount++;

                $('#cartForm').find('thead tr').each(function () {

                    var trow = $(this);
                    trow.append(generateCatHeader(catCount, "catQuestion", "icons/catQuestion.png", true));

                });

                $('#cartForm').find('tbody tr').each(function () {

                    var trow = $(this);
                    trow.append('<td valign="top"><ul id="col' + catCount + '" class="sortableColumn"></ul></td>');

                });

                $("#sortable").sortable();
                $("#sortable").disableSelection();

                $("#col" + catCount).sortable({
                    connectWith: ".sortableColumn",
                    receive : function (event, ui) {
                        resizeColumnHeights();
                    },
                    update: function(event, ui) {
                        suppressOpenInfoDlg = true;
                    }
                }).disableSelection();;

                var colCount = $("#tab").find("tr:first th").length;

                if (colCount> 3) {
                    jQuery.moveColumn($('#tab'), colCount - 1, 2);
                }

            });

            $('#btnGetBin').click(function () {

                // var colCount = $("#tab").find("tr:first th").length;


                // if (allHeadersOK(colCount)) {

                //     whatNext.dialog("open");

                //     $('#output').val(createCSV(colCount));
                //     $('#mode').val('bin');

                //     $("#cartForm").submit();

                // }











                // If all OK, generate data ..

                var colCount = $("#tab").find("tr:first th").length;
                var output = '';
                var selectedItems = [];
                var alt = 0;

                for (var i = 0; i < colCount - 2; i++) {

                    var ul = $("#tab").find("tr:last td:eq(" + (i + 2) + ") ul:first");
                    var idsInOrder = ul.sortable("toArray");

                    for (const value of idsInOrder) {

                        var index = value.substring(2);

                        selectedItems.push(items[index - 1]);

                    }

                    selectedItems.sort(SortByStart);
                
                }

                if (selectedItems.length == 0) return;

                output = "<table id='tblClashes' class='tblClashes' cellpadding='0' cellspacing='0'><tr><td width='225px'></td><td><img src='icons/Ruler.png' title='ruler' /></td></tr>";


                for (var i = 0; i < selectedItems.length; i++) {

                    var hasClashes = false;
                    item = selectedItems[i];

                    if (item.start == "na") break; 


                    // Determine clashes with other items ..

                    var clashIndexes = i + ",";

                    for (var j = 0; j < selectedItems.length; j++) {

                        testItem = selectedItems[j];

                        if (testItem.start == "na") break; 

                        if (item.name != testItem.name) {

                            if (!(parseInt(item.start) >= parseInt(testItem.end) || parseInt(item.end) <= parseInt(testItem.start))) {

                                clashIndexes = clashIndexes + j + ",";
                                hasClashes = true;

                            }

                        }

                    }


                    // Trim last comma off ..

                    if (hasClashes) {
                        //clashes = clashes.slice(0, -2);
                        clashIndexes = clashIndexes.slice(0, -1);
                    }



                    // Render row ..

                    output = output + "<tr><td" + (alt == 1 ? " bgcolor='#ebebeb'" : "") + ">";

                    if (hasClashes) { 
                        output = output + "&nbsp;<img src='icons/Info.png' onclick='clearRows(); highlightRows(" + clashIndexes + ");' /> ";
                    }
                    else {
                        output = output + "&nbsp;<img src='icons/Info_Blank.png' /> ";
                    }

                    output += item.name.replace("\"", "").replace("'", ""); output += "</td><td background='icons/Ruler" + (alt == 0 ? "2" : "3") + ".png' style='vertical-align: middle;'>";



                    // Blank band ..

                    if (parseInt(item.start) > 0) {
                        output = output + "<img src='icons/spacer_white.png' height='12px' width='" + parseInt(item.start) + "px' />";
                    }

                    
                    // Coloured band..

                    if (item.hash == 0) {
                        output = output + "<img src='icons/spacer_red.png' title='" + item.start + " to " + item.end + "' height='16px' width='" + (parseInt(item.end) - parseInt(item.start) + 1) + "px' />";
                    }
                    else {
                        output = output + "<img src='icons/spacer_green.png' title='" + item.start + " to " + item.end + "' height='16px' width='" + (parseInt(item.end) - parseInt(item.start) + 1) + "px' />";
                    }

                    output += "</td></tr>";

                    alt = (alt == 0 ? 1 : 0);

                }

                output = output + "</table>";
                document.getElementById("htmlEEPROMClashes").innerHTML = output;
                eepromClashes.dialog("open");

            });

        }

    });

});

function clearRows() {

    $(".tblClashes tr").each(function() {

        var index = $(this).parent().children().index($(this));

        if (index > 0) { 

            if (index % 2 == 0) {
                $(this).children('td:first').css('background-color','#ebebeb');
                $(this).children('td:last-child').css('background-color','#ebebeb');
                $(this).children('td:last-child').css('background-image','url(icons/Ruler3.png)');
            }
            else {
                $(this).children('td:first').css('background-color','#ffffff');
                $(this).children('td:last-child').css('background-color','#ffffff');
                $(this).children('td:last-child').css('background-image','url(icons/Ruler2.png)');
            }

        }

    });
    

}

function highlightRows() {

    for (var i = 0; i < arguments.length; i++) {

        if (i == 0) {

            if ($('.tblClashesSelected').val() == arguments[0]) return;

            $('.tblClashesSelected').val(arguments[0]);
            $('.tblClashes tr').eq(arguments[i] + 1).children('td:first').css('background-color','#f7dc6f ');
            $('.tblClashes tr').eq(arguments[i] + 1).children('td:last-child').css('background-image','none');
            $('.tblClashes tr').eq(arguments[i] + 1).children('td:last-child').css('background-color','#f7dc6f ');
        }
        else {
            $('.tblClashes tr').eq(arguments[i] + 1).children('td:first').css('background-color','#fcf3cf');
            $('.tblClashes tr').eq(arguments[i] + 1).children('td:last-child').css('background-image','none');
            $('.tblClashes tr').eq(arguments[i] + 1).children('td:last-child').css('background-color','#fcf3cf');
        }
    }

}
