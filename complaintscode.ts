import { count, debug } from 'console';
import { stat, truncate } from 'fs';
import { KloController } from 'kloTouch/jspublic/KloController'
import { FileLoaderUtils } from 'kloBo/Utils/FileLoaderUtils';
import KloAttach from 'kloTouch/KloControl/KloAttach'
import each from 'sap/base/util/each';
import now from 'sap/base/util/now';

declare let KloUI5: any;
let codeControlFlag; // to control the vh select and vh change of category levels
let a = 0;
let c; //made two header sections for technicains , temporarily both codes were there so to differentiate between saves
let Activeindex;
let globalLevelData;
let mupdateflag;
let mobileNewEquipFlag;
let acceptFlag = 0;
let rejectFlag = 0;
let levelValue;
let selectglobal = 'PD';
let cancelFlag;
let f_sno_vh;
let serialFlag;
let outer_param;
let catname: Array<{}> = [];
let categoryData;
let absent_flag = 0;
let global_item_qty = 0;
@KloUI5("field_service.controller.p_complaints")
export default class p_complaints extends KloController {

    public async onPageEnter(oEvent) {
        //This event will be called whenever the screen enters the visible area by means of navigation (Both front and back navigation).
        /*
         
         * The dealer can edit few details of complaint only when he accepts the complaint,items and attachments will be editable only in @inprocess status
         * for line items feedback the max level is hardcoded onPageEnter ()..
         * 
         * 
         * 
         * 
         */

        await FileLoaderUtils.loadCSSFile(this.getFlavor(), this.getFlavorVersion(), 'custom_css');

        await this.tm.getTN('desktop').setData(sap.ui.Device.system.desktop ? '1' : '0');// this tn is used in section toolBar of 'pa_item_detail' page area
        outer_param = oEvent.navToParams || {}; // parameter's that are passed from other screens
        let role = await this.transaction.$SYSTEM.roleID;
        let user = await this.transaction.getUserID();
        let search: Array<{ "level1": string, "level2": string, "level3": string, "level4": string, "level5": string, "level6": string, "level7": string, "level8": string, "level9": string, "level10": string }> = []; //defining an object which will be used in items feedback flow.


        await Promise.all([
            this.tm.getTN('hierarchy').setData(search), // to set schema to hierarchy tn 
            this.tm.getTN('visible').setData(4), // to set last level for feedback as of now hardcoded might changes later(No of feedbacks)
            this.tm.getTN('equipment').setData(0), // to set visibility between new equipment and product in products tab..
            this.tm.getTN('role').setData(role),
            this.tm.getTN('catname').setData(catname), // used in the line items feedback flow..
            this.tm.getTN('ItemVisibility').setData("0"),//items tab visibility
            this.tm.getTN('stock_search_visibility').setData(false)  // setting search toggle to false by default
        ])

        await this.setIssueNotes(); // to set issue notes



        if (role == "DEALER") {
            let p = await this.fetchData("d_customer", { user_id: user });
            let dealer = p[0].customer_id;
            if (outer_param?.QP?.flag !== 'fromHomeScreen') {
                await this.tm.getTN("search").setProperty("status", [
                    'SR_00100', 'SR_00200', 'SR_00400', 'SR_00500',
                    'SR_00600', 'SR_00700', 'SR_00800', 'SR_00900',
                    'SR_01000', 'SR_01100', 'SR_01200', 'SR_01300'
                ]);
            }

            await this.tm.getTN("search").setProperty("dealer", dealer);
            await this.tm.getTN("search").executeP();

        }

        else if (role == "TELECALLER") {
            let a = oEvent.navToParams;
            let b = await this.tm.getTN("search").executeP();
            if ('AD' in a) {
                let index = b.findIndex(o => o.complaint_number == a.AD);

                await this.tm.getTN('list').setActive(index);
                await this.navTo({ S: "p_complaints", SS: "pa_detail_divisions" }, oEvent);
            }

        }
        else if (role == "OEM" || role == "BRANCH") {
            let q = await this.tm.getTN("search").getData();
            let p = await this.fetchData("d_customer", { user_id: user });
            let q3 = await this.transaction.getQueryP('d_relation_map');
            q3.setLoadAll(true);   //need to optimize this
            let relation_map = await q3.executeP();

            let filtered_relation_map = relation_map.filter(item => item.user_sub === p[0].customer_id);
            let dealer_list = await this.findDealers(filtered_relation_map[0].user_main, relation_map);
            if (dealer_list.length > 0) {
                q.dealer = dealer_list;
                if (outer_param && outer_param.QP && 'flag' in outer_param.QP && outer_param.QP.flag === 'fromHomeScreen') {
                    // do nothing
                }
                else {
                    q.status = ['SR_00100', 'SR_00200', 'SR_00400', 'SR_00500', 'SR_00600', 'SR_00700', 'SR_00800', 'SR_00900', 'SR_01000', 'SR_01100', 'SR_01200', 'SR_01300']
                }
                q.setLoadAll(true);
                await q.executeP();

            }
        }
        else {  //else means as of now technician and developer 

            await this.tm.getTN("search").executeP();
            let attend_list = await this.fetchData("q_attendance_h");
            console.log(attend_list);
            absent_flag = 0; // flag = 0 
            if (attend_list.length == 0) {
                absent_flag = 1;
                console.log('absent with length 0');
            }
            else if (attend_list[0].status == 'CO') {
                absent_flag = 1;
                console.log('absent with status co');
            }
        }

        let visibileForCRUD = 0;  //edit button visibility for mobilr screen
        let a = oEvent.navToParams.AD //status passed from mcomplaints (technician mobile screen)
        let p;

        if (role == "TECHNICIAN") {   // just wrote to check status on page refresh
            if (a) {
                p = a;
            }
            else {
                p = await this.tm.getTN('detail').getData().status;

            }
        }

        let d_data = await this.tm.getTN('detail').getData().totech_trip?.fetch();
        visibileForCRUD = 0;
        if (absent_flag == 0) {  // absent_flag >> to check whether  tech is present or absent  on current day , if absent means no action buttons will be visible to techncian
            if (p) {  // p is the status of the complaint the technician wants to navigate to detail , based on status the action butons will be visibled



                switch (p) {

                    case "SR_00100": // Open

                        await this.tm.getTN('current_timeline').setData('1');

                        break;


                    case "SR_00200": //Accepted by dealer
                        this.getActiveControlById('accept', 's_mheader_copy_new').setVisible(true)
                        this.getActiveControlById('reject', 's_mheader_copy_new').setVisible(true)
                        // Added By Venkatesh on 28/04/25==>CODE START

                        await this.tm.getTN('current_timeline').setData('2');


                        //Added By Venkatesh on 28/04/25<==CODE END

                        break;
                    case "SR_00500": //Accepted by tech
                        if (d_data.length == 0) {
                            this.getActiveControlById('StartTrip', 's_mheader_copy_new').setVisible(true);
                        } else if (d_data.length == 1 && d_data[0].trip_end == null) {
                            this.getActiveControlById('EndTrip', 's_mheader_copy_new').setVisible(true);
                        }
                        // this.getActiveControlById('reschedule', 's_mdetail').setVisible(true);
                        this.getActiveControlById('caller', 's_mheader_copy_new').setVisible(false);
                        this.getActiveControlById('location', 's_mheader_copy_new').setVisible(false);
                        this.getActiveControlById('reshchdeule', 's_mnappointment').setVisible(true);
                        // Added By Venkatesh on 28/04/25==>CODE START

                        await this.tm.getTN('current_timeline').setData('2');


                        //Added By Venkatesh on 28/04/25<==CODE END
                        break;
                    case "SR_00700": //Reached at Site
                        this.getActiveControlById('inProcess', 's_mheader_copy_new').setVisible(true);
                        this.getActiveControlById('caller', 's_mheader_copy_new').setVisible(false);
                        this.getActiveControlById('location', 's_mheader_copy_new').setVisible(false);
                        this.getActiveControlById('reshchdeule', 's_mnappointment').setVisible(true);
                        // Added By Venkatesh on 28/04/25==>CODE START

                        await this.tm.getTN('current_timeline').setData('3');


                        //Added By Venkatesh on 28/04/25<==CODE END
                        break;
                    case "SR_00900": //inprocess
                        visibileForCRUD = 1;
                        await this.tm.getTN('ItemVisibility').setData("1");
                        this.getActiveControlById('warranti', 's_mnwarranty').setVisible(true);
                        this.getActiveControlById('reshchdeule', 's_mnappointment').setVisible(false);
                        // Added By Venkatesh on 28/04/25==>CODE START

                        await this.tm.getTN('current_timeline').setData('4');


                        //Added By Venkatesh on 28/04/25<==CODE END
                        break;
                    case "SR_00800": //pending
                        await this.tm.getTN('ItemVisibility').setData("0");
                        let strt = d_data.filter(o => o.trip_start == null);
                        if (strt.length == 0) {
                            this.getActiveControlById('StartTrip', 's_mheader_copy_new').setVisible(true);
                        }
                        let end = d_data.filter(o => o.trip_end == null);
                        if (end.length == 1) {
                            this.getActiveControlById('EndTrip', 's_mheader_copy_new').setVisible(true);
                            this.getActiveControlById('StartTrip', 's_mheader_copy_new').setVisible(false);
                        }

                        visibileForCRUD = 0;
                        this.getActiveControlById('caller', 's_mheader_copy_new').setVisible(true);
                        this.getActiveControlById('location', 's_mheader_copy_new').setVisible(true);
                        this.getActiveControlById('reshchdeule', 's_mnappointment').setVisible(true);
                        this.getActiveControlById('warranti', 's_mnwarranty').setVisible(false);
                        // Added By Venkatesh on 28/04/25==>CODE START

                        await this.tm.getTN('current_timeline').setData('4');


                        //Added By Venkatesh on 28/04/25<==CODE END
                        break;

                    case "SR_01000": //resolved
                        await this.tm.getTN('ItemVisibility').setData("1");
                        this.getActiveControlById('reshchdeule', 's_mnappointment').setVisible(false);
                        this.getActiveControlById('warranti', 's_mnwarranty').setVisible(false);
                        // Added By Venkatesh on 28/04/25==>CODE START

                        await this.tm.getTN('current_timeline').setData('5');


                        //Added By Venkatesh on 28/04/25<==CODE END
                        break;
                    default:
                        break;
                }



                // setting the Node TN's
                await this.tm.getTN('node_1').setData('1');
                await this.tm.getTN('node_2').setData('2');
                await this.tm.getTN('node_3').setData('3');
                await this.tm.getTN('node_4').setData('4');
                await this.tm.getTN('node_5').setData('5');

                let cust = await this.tm.getTN('detail').getData()?.tocustomer[0]?.toaddress.fetch();
                let mobile_no = cust[0].mobile_no;
                let alt_mobile_no = cust[0].alt_mobile_no;

                let customer_mobile = [
                    {
                        type: 'PRI',
                        description: 'Primary Mobile',
                        mobile: mobile_no
                    }
                ];

                // Only add alternate number if it exists and is not empty
                if (alt_mobile_no && alt_mobile_no.trim() !== "") {
                    customer_mobile.push({
                        type: 'ALT',
                        description: 'Alternate Mobile',
                        mobile: alt_mobile_no
                    });
                }

                await this.tm.getTN("customer_mobile").setData(customer_mobile);


            }
            this.getActiveControlById('edit_com', 's_mheader_copy_new').setVisible(visibileForCRUD === 1);

        }



    }

    public async setIssueNotes() { // used to set vh vombo box under Notes section 
        //setting issue notes vh==>START

        let arr = [];

        arr.push({ note_type: 'PD', description: 'Problem Description' });
        arr.push({ note_type: 'RD', description: 'Resolution Description' });
        arr.push({ note_type: 'AD', description: 'Additional Information' });
        arr.push({ note_type: 'AL', description: 'Summmary' });
        await this.tm.getTN('note_type_vh').setData(arr);

        //setting issue notes vh==>END
    }

    public async onTypeSelect() { // written by venkatesh for the issue notes section
        let not_found_flag;
        //   console.log(oEvent);
        let selectedKey;
        let a = this.getActiveControlById('i_input', 's_notes_header');
        console.log(a);
        let Mode = 0;

        //  var oComboBox = oEvent.getSource();

        // Get the selected item
        //  var oSelectedItem = oComboBox.getSelectedItem();
        let mode = this.getMode();
        if (mode == "EDIT" || mode == "CREATE") {
            Mode = 1;
        }
        // if (oSelectedItem.endsWith('combo-0')) {    // Commented after change from kloinput to combo box
        //     selectedKey = 'PD';  // 'input-0' corresponds to 'PD'

        // } else if (oSelectedItem.endsWith('combo-1')) {
        //     selectedKey = 'RD';  // 'input-1' corresponds to 'RD'
        // } else if (oSelectedItem.endsWith('combo-2')) {
        //     selectedKey = 'AD';  // 'input-1' corresponds to 'AD'
        // } else if (oSelectedItem.endsWith('combo-3')) {
        //     selectedKey = 'AL';  // 'input-1' corresponds to 'AL'
        // }
        // await this.tm.getTN('selected_note_type').setData(selectedKey);
        selectedKey = await this.tm.getTN('selected_note_type').getData();

        // await this.tm.getTN('placeholder').setData(selectedKey);
        switch (selectedKey) {
            case 'PD':
                await this.tm.getTN('placeholder').setData('Problem Description');
                break;
            case 'AD':
                await this.tm.getTN('placeholder').setData('Additional Information');
                break;
            case 'RD':
                await this.tm.getTN('placeholder').setData('Resolution Description');
                break;
            case 'AL':
                await this.tm.getTN('placeholder').setData('Summary');
                break;
        }

        selectglobal = selectedKey;
        if (selectedKey == 'RD') {
            let btn = this.getActiveControlById('add', 's_notes_header');
            if (Mode == 1) {
                btn.setVisible(true);

            }

            let d = this.getActiveControlById('issue_note', 's_notes_header');
            d.setVisible(true);
            let m = this.getActiveControlById('show_data', 's_notes_header');
            m.setVisible(false);
            let active_data = await this.tm.getTN('detail').getData();
            let issues = await active_data.toissuenote?.fetch();
            // let q2 = await this.transaction.getQueryP('d_issue_notes');
            // q2.setLoadAll(true);
            // q2.setSkipMap(true);  // to always fire query and not fetch from cache
            // q2.ref_guid = active_data.guid;
            // let issues = await q2.executeP();
            for (let data of issues) {
                if (data.note_type == 'RD') {
                    await this.tm.getTN('detail_issue').setData(data);
                    not_found_flag = 1;
                    let btn = this.getActiveControlById('add', 's_notes_header');
                    btn.setVisible(false);
                }
            }
            if (not_found_flag != 1) {
                let d = this.getActiveControlById('add', 's_notes_header');
                // let m = this.getSubscreenControl('s_notes_header');
                // m.setVisible(false);
                let m = this.getActiveControlById('issue_note', 's_notes_header');
                m.setVisible(false);
                console.log(d.mProperties.visible);

                if (Mode == 1) {
                    d.setVisible(true);

                }
                //    let ref_guid =await this.tm.getTN('detail').getData().guid;
                //    let data = await  this.tm.getTN('issue').createEntityP({ref_guid:ref_guid ,note_type: 'RD'},'successful','Failed','','First',false,true)
            }
        }

        if (selectedKey == 'PD') {
            let pd_flag = 0;
            let btn = this.getActiveControlById('add', 's_notes_header');
            if (Mode == 1) {
                btn.setVisible(true);

            }
            let d = this.getActiveControlById('issue_note', 's_notes_header');
            d.setVisible(true);
            let m = this.getActiveControlById('show_data', 's_notes_header');
            m.setVisible(false);
            let active_data = await this.tm.getTN('detail').getData();
            let issues = await active_data.toissuenote?.fetch();
            // let q2 = await this.transaction.getQueryP('d_issue_notes');
            // q2.setLoadAll(true);
            // q2.setSkipMap(true);  // to always fire query and not fetch from cache
            // q2.ref_guid = active_data.guid;
            // let issues = await q2.executeP();
            for (let data of issues) {
                if (data.note_type == 'PD') {
                    await this.tm.getTN('detail_issue').setData(data);
                    let m = this.getSubscreenControl('s_notes_header');
                    m.setVisible(true);
                    pd_flag = 1;
                    let btn = this.getActiveControlById('add', 's_notes_header');
                    btn.setVisible(false);
                    // }else{
                    //     let d = this.getActiveControlById('add','s_notes_header');
                    //     console.log(d.mProperties.visible);
                    //     d.setVisible(false);
                    // }
                }
            }
            if (pd_flag != 1) {
                // let m = this.getSubscreenControl('s_notes_header');
                // m.setVisible(false);
                let m = this.getActiveControlById('issue_note', 's_notes_header');
                m.setVisible(false);
            }

        }
        if (selectedKey == 'AD') {
            let ad_flag = 0;
            let d = this.getActiveControlById('issue_note', 's_notes_header');
            d.setVisible(true);
            let m = this.getActiveControlById('show_data', 's_notes_header');
            m.setVisible(false);
            let btn = this.getActiveControlById('add', 's_notes_header');

            if (Mode == 1) {
                btn.setVisible(true);

            }
            let active_data = await this.tm.getTN('detail').getData();
            let issues = await active_data.toissuenote?.fetch();
            // let q2 = await this.transaction.getQueryP('d_issue_notes');
            // q2.setLoadAll(true);
            // q2.setSkipMap(true);  // to always fire query and not fetch from cache
            // q2.ref_guid = active_data.guid;
            // let issues = await q2.executeP();

            for (let data of issues) {
                if (data.note_type == 'AD') {
                    await this.tm.getTN('detail_issue').setData(data);
                    ad_flag = 1;
                    let m = this.getSubscreenControl('s_notes_header');
                    m.setVisible(true);
                    // }else{
                    //     let d = this.getActiveControlById('add','s_notes_header');
                    //     console.log(d.mProperties.visible);
                    //     d.setVisible(false);
                    // }
                }
            }
            if (ad_flag != 1) {
                // let m = this.getSubscreenControl('s_notes_header');
                // m.setVisible(false);
                let m = this.getActiveControlById('issue_note', 's_notes_header');
                m.setVisible(false);
            }

        }
        if (selectedKey == 'AL') {
            let btn = this.getActiveControlById('add', 's_notes_header');
            btn.setVisible(false);
            this.tm.getTN('other_formateddata').setData();
            let d = this.getActiveControlById('issue_note', 's_notes_header');
            d.setVisible(false);
            let m = this.getActiveControlById('show_data', 's_notes_header');
            m.setVisible(true);
            let active_data = await this.tm.getTN('detail').getData();
            let issues = await active_data.toissuenote?.fetch();
            // let q2 = await this.transaction.getQueryP('d_issue_notes');
            // q2.setLoadAll(true);
            // q2.setSkipMap(true);  // to always fire query and not fetch from cache
            // q2.ref_guid = active_data.guid;
            // let issues = await q2.executeP();
            let text;
            for (let data of issues) {
                if (data.note_type == 'AL') {
                    text = data.issue_note;
                }
            }
            // const addLineBreaks = (text) => {
            //     return text.replace(/ /g, "\n");  // Replace spaces with newlines
            // };

            // // Store the formatted result in a variable
            // let formattedResult = "";

            // // Build the formatted string
            // issues.forEach((entry, index) => {
            //     // formattedResult += `Entry ${index + 1}:\n`;
            //     if(entry.note_type == 'PD'){
            //     formattedResult += `Problem Description : ${entry.s_created_on}\n`;
            //     formattedResult += "----\n";
            //     formattedResult += addLineBreaks(entry.issue_note) + "\n\n";
            //     formattedResult += "----\n";
            //     }else if(entry.note_type == 'RD'){
            //     formattedResult += `Resolution Description : ${entry.s_created_on}\n`;
            //     formattedResult += "----\n";
            //     formattedResult += addLineBreaks(entry.issue_note) + "\n\n";
            //     formattedResult += "----\n";
            //     }
            // });
            // const text = formattedResult;
            const formattedText = text.replace(/#/g, '\n');  // Replace '#' with actual newline character
            console.log(formattedText);
            this.tm.getTN('other_formateddata').setData(formattedText);


        }
    }
    // let search: Array<{
    //     level1: string;
    //     level2: string;
    //     level3: string;
    //     level4: string;
    //     level5: string;
    //     level6: string;
    //     level7: string;
    //     level8: string;
    //     level9: string;
    //     level10: string;
    //   }> = [];
    /*public async onPageModelReady() {
        //This event will be called when the model is created and the transnodes are initialized, but the Data is not set to the model yet.
    }*/

    /*public async onPageExit() {
          //This event will be called in the source screen whenever the developer navigates to a different screen.
    }*/

    public async onAdd() {  //to create complaint from the dealer screen..
        cancelFlag = 1
        let role = await this.transaction.$SYSTEM.roleID;
        if (role == "DEALER") { // only dealer can create complaint from complaint screen 
            let dlr = await this.fetchData('q_active_user');
            let dealer = dlr[0].customer_id; // can be optimised;

            await this.tm.getTN('list').createEntityP({ "status": 'SR_00100', complaint_number: 'CREATE', dealer: dealer }, 'successful', 'Failed', 'pa_detail_divisions', 'First', false, true);
            let ref_guid = await this.tm.getTN('detail').getData().guid;
            // await  this.tm.getTN('issue').createEntityP({ref_guid:ref_guid ,note_type: 'PD'},'successful','Failed','','First',false,true)
            let brand_data = await this.transaction.getExecutedQuery('d_brand_map', { loadAll: true, id: dealer });
            let brand = brand_data.map(o => o.brand);
            await this.tm.getTN('search_product').setProperty('brand', brand);
            let a = await this.tm.getTN('search_product').executeP(); //to set product vh based on the brands supported by the dealer
            await this.tm.getTN('search_customer').setProperty('brand', brand);
            let b = await this.tm.getTN('search_customer').executeP(); // to set customer vh based on the brands supported by the dealer
        }
        else {
            console.log('role is not dealer');
            // await this.tm.getTN('list').createEntityP({"status":'SR_00100',complaint_number:'CREATE'},'successful','Failed','pa_detail_divisions','First',false,true);
        }
    }

    public async onProductChange() {  // to assign tech and dealer based on the product and customer [location] so when product changes this function calls
        let data = await this.tm.getTN('detail').getData();
        // let sc = data.service_center;
        let sc = data.dealer;
        let p = data.product_id;
        let product = await this.fetchData('d_product', { product_id: p });
        let brand = product[0].brand;

        // let serviceC = await this.fetchData('d_sc_technician',{service_center_id : sc});
        // let filteredTech = serviceC.filter((center: any) => {

        //     // Log the brand to debug
        //     console.log('Center Brand:', center.brand);

        //     // Ensure center.brand is a string and split it into an array
        //     const brandString = typeof center.brand === 'string' ? center.brand.trim() : '';
        //     const brands = brandString ? brandString.split(',') : [];

        //     // Check if the desired brand is in the array
        //     return brands.includes(brand);
        // });
        let techie = await this.technician(sc, brand);
        await this.tm.getTN('detail').setProperty('technician', techie);// need to change this logic to best technician



        console.log(techie);
    }
    public async technician(service_center, brand) { // method to get technicians with less no of complaints
        let technicians = await this.fetchData('q_subgrp_tech', { user_main: service_center });
        let tech_data = technicians.map(o => o.customer_id);
        let tech_arr = Array.from(tech_data)
        // let filteredTechnicians = technicians.filter((center: any) => {

        //     // Log the brand to debug
        //         console.log('Center Brand:', center.brand);

        //         // Ensure center.brand is a string and split it into an array
        //         const brandString = typeof center.brand === 'string' ? center.brand.trim() : '';
        //         const brands = brandString ? brandString.split(',') : [];

        //         // Check if the desired brand is in the array
        //         return brands.includes(brand);
        // });



        if (tech_arr.length > 0) {
            let filteredTechnicians = await this.fetchData('q_brand_map', { cust_id: tech_arr, brand: brand });
            if (filteredTechnicians.length > 0) {
                let lowestComplaintsCount = Infinity;
                let bestTechician = null;

                for (const techni of filteredTechnicians) {
                    // Fetch open complaints for the current service center
                    const openComplaints = await this.fetchData('q_servicecenter', { dealer: service_center, technician: techni.id });

                    // Check the number of open complaints
                    const complaintsCount = openComplaints.length; // Adjust this if `fetchData` returns a different structure

                    // Update the service center with the lowest number of complaints
                    if (complaintsCount < lowestComplaintsCount) {
                        lowestComplaintsCount = complaintsCount;
                        bestTechician = techni.id;
                    }
                }
                console.log('technicians is success:', bestTechician)
                return bestTechician;
            }
            else {
                sap.m.MessageToast.show('technician not found for mentioned brand')
            }

        }

    }

    public async onEdit() {
        this.setMode("EDIT");
    }

    public async onSave() {
        // let b = await this.tm.getTN('detail').getData().toissuenote.fetch().length;
        let data = this.tm.getTN('detail').getData()
        let torel = await this.tm.getTN('detail').getData();
        let status = this.tm.getTN('detail').getData().status;
        let now = new Date();

        let torellenght = await torel.toissuenote?.fetch();
        let b = torellenght.length;
        if (status == "SR_01000") {  //resolved > if status is resolved means we need to check the items on behalf of technician>> csat is mandatory 
            try {

                await this.tm.getTN("detail").setProperty("resolved_date", now);
                await this.itemCheck();
                console.log('Item Check Success');
                if (a == 1) { // if a = 1 means new equipment added this you can find on newequipment method
                    console.log('New Equip Added')
                    await this.fillEquip();
                    console.log('New Equip ENdded')

                }
                console.log('Next commit');
                await this.tm.commitP("", "Save Failed", false, true);

                await this.RefreshData();


                console.log('commit succes');
                (await this.getMessageBox()).information("Succesfully Saved");


            }

            catch (error) {
                await this.transaction.rollback();
                sap.m.MessageBox.error(error.message);
                // await this.tm.getTN('detail').setProperty("status", "SR_00900");

            }
        }

        // if(acceptFlag == 1){
        //     acceptFlag = 0;
        //     let e =this.getActiveControlById('Accept','s_detail_header');
        //     e.setVisible(false);
        //     let d =this.getActiveControlById('Reject','s_detail_header');
        //     d.setVisible(false);
        // }
        // if(rejectFlag == 1){
        //     rejectFlag = 0;
        //     let d =this.getActiveControlById('Accept','s_detail_header');
        //     d.setVisible(false);
        //     let e =this.getActiveControlById('Reject','s_detail_header');
        //     e.setVisible(false);
        // }

        // let b = a.toissuenote.length;
        else {
            if (b === 0) {
                try {
                    console.log(1)
                    throw new Error(`Please add issue notes`);
                }
                catch (error) { sap.m.MessageBox.error(error.message); }


                // sap.m.MessageToast.show('Please add issue notes')
            }
            else if (b > 0) {
                let c = await torel.toissuenote.fetch();
                let d = c.filter(o => o.note_type == 'PD');
                let len = d.length;
                if (len > 0) {
                    if (a == 1) {
                        console.log('New Equip Added')
                        await this.fillEquip();
                        console.log('New Equip ENdded')

                    }
                    try {
                        await this.tm.commitP("", "Save Failed", false, true);


                    } catch (error) {
                        console.log(error);
                    }




                    // let list = await this.tm.getTN('list').setActive(0);
                    // list.findIndex(o =>o.complaint_number == "");
                    await this.RefreshData();
                    (await this.getMessageBox()).information("Succesfully Saved")

                }
                else {
                    try { throw new Error(`Please add issue notes with PD`); }
                    catch (error) { sap.m.MessageBox.error(error.message); }
                    // sap.m.MessageToast.show('Please add issue notes with PD')}
                }

                let e = this.getActiveControlById('newequipment', 's_product');
                e?.setVisible(false);  // for 

            }
        }





    }
    async RefreshData() {
        //refreshes all tns after save
        try {
            const tasks = [
                (async () => {
                    try {
                        await this.tm.getTN('list').getData().refreshP();
                    } catch (e) {
                        console.error('Failed to refresh list:', e);
                    }
                })(),
                (async () => {
                    try {
                        await this.tm.getTN('product').getData().refreshP();
                    } catch (e) {
                        console.error('Failed to refresh product:', e);
                    }
                })(),
                (async () => {
                    try {
                        await this.tm.getTN('customer').getData().refreshP();
                    } catch (e) {
                        console.error('Failed to refresh customer:', e);
                    }
                })(),
                (async () => {
                    try {
                        await this.tm.getTN('item').getData().refreshP();
                    } catch (e) {
                        console.error('Failed to refresh item:', e);
                    }
                })(),
                (async () => {
                    try {
                        await this.tm.getTN('category').getData().refreshP();
                    } catch (e) {
                        console.error('Failed to refresh category:', e);
                    }
                })(),
                (async () => {
                    try {
                        await this.tm.getTN('issue').getData().refreshP();
                    } catch (e) {
                        console.error('Failed to refresh issue:', e);
                    }
                })(),
                (async () => {
                    try {
                        await this.tm.getTN('technician').getData().refreshP();
                    } catch (e) {
                        console.error('Failed to refresh technician:', e);
                    }
                })(),
                (async () => {
                    try {
                        await this.tm.getTN('dealer').getData().refreshP();
                    } catch (e) {
                        console.error('Failed to refresh dealer:', e);
                    }
                })(),
            ];

            await Promise.all(tasks);
        } catch (error) {
            await this.duplicateRefresh();
        }



    }

    async duplicateRefresh() {  //if any error occurs in the above refresh then this will trigger * not needed but as a worst case
        await this.tm.getTN('list').getData().refreshP();
        await this.tm.getTN('product').getData().refreshP();
        await this.tm.getTN('customer').getData().refreshP();
        await this.tm.getTN('item').getData().refreshP();
        await this.tm.getTN('issue').getData().refreshP();
        await this.tm.getTN('technician').getData().refreshP();
        await this.tm.getTN('dealer').getData().refreshP();
        await this.tm.getTN('category').getData().refreshP();
    }


    public async fillEquip() {  // wrote on 19 2 2025  // to fill the prodcuct tab -- warranty details and setial number
        a = 0;
        await this.tm.getTN('equipment').setData(0);
        let d = this.getActiveControlById('newequipment', 's_product');
        d.setVisible(false);
        let equip = await this.tm.getTN('detail_Equipment').getData()
        await this.transaction.createEntityP('d_equipment_customer', { serial_no: equip.serial_no, guid: equip.customer_id, customer_id: equip.customer_id });

        let productId = await this.tm.getTN('detail_Equipment').getData().product_id;
        let dop = await this.tm.getTN('detail_Equipment').getData().date_of_purchase;
        await this.tm.getTN('detail').setProperty('product_id', productId)
        await this.fillproductdetail(productId, dop)
    }


    public async onAddItem() {
        await this.tm.getTN('item').createEntityP({}, 'successful', 'Failed', '', 'First', false, true);
    }

    public async onSaveItem() {

        this.tm.commitP("Saved Successfully", "Save Failed", false, true);
        await this.tm.getTN('hierarchy').setData(search);
        this.closeDialog('pa_dialog');

    }


    public async onCreateCancel() {
        await this.transaction.rollback();
        if (cancelFlag == 1) {
            await this.tm.getTN("list").setActive(0); // it will setactive to 1st row only on new complaint creation
            cancelFlag = 0;
        }

        this.setMode('DISPLAY');
        await this.tm.getTN('equipment').setData(0);
        let f = this.getActiveControlById('newequipment', 's_product');
        f.setVisible(false);
        // await this.navTo({S: "p_customers"});
    }
    public async onItemCancel() {
        await this.closeDialog("pa_item_detail");
        // await this.transaction.rollback();
        let search: Array<{ "level1": string, "level2": string, "level3": string, "level4": string, "level5": string, "level6": string, "level7": string, "level8": string, "level9": string, "level10": string }> = [];
        catname = [];
        await this.tm.getTN('catname').setData(catname);
        await this.tm.getTN('hierarchy').setData(search);

    }




    public async onNavToProduct() {
        let active_data = await this.tm.getTN('list').getActiveData();
        let curr_prod_id = active_data.product_id;
        let q = await this.transaction.getQueryP('d_product');
        q.setLoadAll(true);
        q.product_id = curr_prod_id;
        let a = await q.executeP();
        this.navTo({ S: "p_products", SS: "s_detail", D: "d_product@@" + a[0].product_guid });

    }

    public async onNavToService() {
        let active_data = await this.tm.getTN('list').getActiveData();
        let q = await this.transaction.getQueryP('q_service_center');
        q.service_center_id = active_data.service_center;
        q.setLoadAll(true);
        let a = await q.executeP();
        this.navTo({ S: "p_service_center", SS: "s_address", D: "d_service_center_master@@" + a[0].service_center_id });

    }

    //  to open attachment detail 
    // public async onattachmentname(oEvent){
    //     let ln=oEvent.mParameters.rowIndex;
    //     this.tm.getTN('attachment').setActive(ln);
    //     await this.openDialog('pa_dialog');


    // }
    //  to save attachment
    public async onattachmentsave() {
        let a = this.getActiveControlById("attachment_name", "s_add_attachment");
        let name = a.mProperties.value;
        this.tm.getTN("attachment_detail").setProperty("attachment_name", name);

        await this.tm.commitP("Saved Successfully", "Save Failed", false, true);
        await this.closeDialog('pa_addattachdialog');
        await this.tm.getTN('attachment').getData().refreshP();
        await this.setMode("EDIT");
    }

    //  to create attachment
    public async addattachmentdialog() {
        let ref_id = await this.tm.getTN('detail').getActiveData().guid;
        await this.tm.getTN('attachment_list').createEntityP({ ref_guid: ref_id }, 'successful', 'Failed', 'pa_addattachdialog', 'First', false, true);

    }




    // Utility function to handle getQueryP, setLoadAll, and executeP


    public async fetchData(queryName: string, params: { [key: string]: any } = {}, loadAll: boolean = true) {

        let query = await this.transaction.getQueryP(queryName);
        Object.assign(query, params);  // Assign params to query
        query.setLoadAll(loadAll);     // Set loadAll flag if needed
        return await query.executeP(); // Execute the query and return result
    }




    public async afterChange() {
        // to check if serial no exists in equipment ;if no then add button wil be visible 
        // if Sno already exists then it checks the product id,then dop and warranty fields will auto fill
        let sno = await this.tm.getTN('detail').getData().serial_number;
        let existing_product_id = await this.tm.getTN('detail').getData().product_id;
        let productData = await this.fetchData('q_equipment_master', { serial_no: sno });


        if (productData.length > 0) {
            let productId = productData[0].product_id;
            if (existing_product_id == productId) {
                let dop = productData[0].date_of_purchase;
                await this.fillproductdetail(existing_product_id, dop);
            }
            else {
                let messageBox = await this.getMessageBox();
                messageBox.confirm(`Do you want Change Product?
                                    For S.No:${sno},the product is ${productId}`,
                    {
                        actions: [messageBox.Action.OK, messageBox.Action.CANCEL],
                        onClose: async (oAction) => {
                            if (oAction == 'OK') {
                                let dop = productData[0].date_of_purchase;
                                let a = await this.tm.getTN('detail').setProperty('product_id', productId);
                                await this.fillproductdetail(productId, dop)
                            }
                        }
                    }
                )
            }

        }
        else {
            sap.m.MessageToast.show('Serial Number Not Found');
            if (mobileNewEquipFlag == 1) {
                let d = this.getActiveControlById('add_attach', 's_serial');
                // d.setVisible(true);
                mobileNewEquipFlag = 0;
            }
            else {
                let d = this.getActiveControlById('newequipment', 's_product');
                d.setVisible(true);
            }

        }



    }
    public async onContinue() {

        let e = this.getActiveControlById('continue', 's_addEquipment');
        e.setVisible(false);
        await this.tm.getTN('equipment').setData(0);
        let productId = await this.tm.getTN('detail_Equipment').getData().product_id;
        let dop = await this.tm.getTN('detail_Equipment').getData().date_of_purchase;
        await this.tm.getTN('detail').setProperty('product_id', productId)
        await this.fillproductdetail(productId, dop)
    }

    public async newEquipment() { // to create new equipment if serial no not found in the system....

        let cust_id = await this.tm.getTN('detail').getData().customer_id;
        let gu = await this.fetchData('d_customer', { customer_id: cust_id });
        let guid = gu[0].guid;
        let addr = await this.fetchData("d_address", { guid: guid, isprimary: true });
        // let prod_id =await this.tm.getTN('detail').getData().product_id;
        let serial_no = await this.tm.getTN('detail').getData().serial_number;
        let product = await this.tm.getTN('detail').getData().product_id;
        // customer_id:cust_id,serial_no:serial_no,product_id:prod_id
        let address
        if (addr.length > 0) {
            address = addr[0].address_no
        }
        a = 1; // for on save 
        await this.tm.getTN('equipment').setData(1); // to control visiblility between product section and equipment section
        let d = await this.tm.getTN('list_equipment').createEntityP({ customer_id: cust_id, serial_no: serial_no, product_id: product, address: address }, 'successful', 'Failed', '', 'First', false, true)
        let e = this.getActiveControlById('continue', 's_addEquipment');
        e.setVisible(true);
        let f = this.getActiveControlById('newequipment', 's_product');
        f.setVisible(false);
    }
    // public async onEquipSave(){
    //     await this.tm.commitP("Saved Successfully","Save Failed", false, false)
    //     await this.closeDialog('pa_addEquipment');
    //     let d =this.getActiveControlById('newequipment','s_product');
    //     d.setVisible(false);
    //     let serial_no = await this.tm.getTN('detail_Equipment').getData().serial_no;
    //     let productId = await this.tm.getTN('detail_Equipment').getData().product_id;
    //     let brand = await this.fetchData('q_product', { product_id:productId });
    //         let branddata= brand[0].brand;
    //     let messageBox = await this.getMessageBox();
    //     messageBox.confirm(`Do you want Change Product; For S.No:${serial_no} the product is ${productId} & brand is ${branddata} `,
    //         {actions:[messageBox.Action.OK,messageBox.Action.CANCEL],
    //          onClose:async (oAction)=>{if(oAction == 'OK') {
    //             await this.tm.getTN('detail').setProperty('serial_number',serial_no);
    //             await this.tm.getTN('detail').setProperty('product_id',productId);
    //             await this.tm.commitP("Saved Successfully","Save Failed", false, false)
    //          }

    //             }
    //         })
    //     // alert(`newly created sno is ${serial_no}`);

    // }
    public async onCreateIssue() { // to create issue notes <venkatesh>
        let d = this.getActiveControlById('add', 's_notes_header');
        d.setVisible(false);
        // let m = this.getSubscreenControl('s_notes_header');
        let m = this.getActiveControlById('issue_note', 's_notes_header');
        m.setVisible(true);
        let n = this.getActiveControlById('show_data', 's_notes_header');
        n.setVisible(false);
        let ref_guid = await this.tm.getTN('detail').getData().guid;
        await this.tm.getTN('issue').createEntityP({ ref_guid: ref_guid, note_type: selectglobal }, 'successful', 'Failed', '', 'First', false, true)

    }
    public async onNewItem() {
        // await this.tm.getTN('search_stock').executeP();

        let role = await this.tm.getTN('role').getData();

        if (role == 'TECHNICIAN') {

            let q = await this.transaction.getQueryP('q_tech_stock_info');
            q.setLoadAll(true);
            let list = await q.executeP();
            await this.tm.getTN('list_tech_stock').setData(list);

        }
        else if (role == 'DEALER') {
            let data = await this.tm.getTN('detail').getData();
            let q = await this.transaction.getQueryP('q_tech_stock_info_dlr');  // need to change query name here
            q.setLoadAll(true);
            //q.fg_product = data.product_id;
            q.employee_id = data.technician;
            let list = await q.executeP();
            await this.tm.getTN('list_tech_stock').setData(list);
        }



        this.tm.getTN('stock_search_visibility').setData(false);
        await this.openDialog('pa_mtechstock');
    }

    public async Duplicate() {

    }

    public async onnewitem_usingscanner(serial_no: any) { // this function is being used in line items flow

        console.log('1-succesfully entered onnewitem_usingscanner function')
        codeControlFlag = 0;
        let data = await this.tm.getTN('detail').getData()
        let item_data = this.tm.getTN('item').getData();
        let itemid: Number = (item_data.length + 1) * 10;

        let a = await this.transaction.getQueryP("q_serial_compl_item_creation");
        a.setLoadAll(true);
        a.serial_number = serial_no
        a.employee_id = data.technician;
        let p = await a.executeP();
        if (p.length == 0) { sap.m.MessageToast.show('Spare Not Found'); return; }
        let spare_data = p[0]
        let item = await this.tm.getTN('item').getData();
        let existing_serial = await this.fetchData('q_notresolved'); // to check whether this spare part has been added in some other complaint
        let arr1 = Array.from(existing_serial.map(o => o.serial_number));

        let existing_serial_id = item.map(o => o.serial_number); //to check in active complaint
        let arr = Array.from(existing_serial_id);
        let mergedArray = arr1.concat(arr);
        const isSerialNoPresent = mergedArray.includes(serial_no);
        if (isSerialNoPresent) { // if its found in active or some other complaint means it will return following toast message
            sap.m.MessageToast.show('Spare Part already used'); // if its been used in some other complaint 
        }
        else {

            // in else part the line item will be created..
            await this.tm.getTN('item').createEntityP({ guid: data.guid, item_number: itemid, item_id: 'CREATE', complaint_number: data.complaint_number, spare_part: spare_data.product_id, spare_part_desc: spare_data.product_desc, serial_number: serial_no }, 'successful', 'Failed', '', 'First', false, true)
            console.log('2-succesfully created item')
            return;


            // this below codes are used for the prior feeback flow..where the level 1 will be autofilled and remaining levels be editable
            // to set category data level 1 value
            let t = await this.fetchData('d_product', { product_id: data.product_id });
            let catid = t[0].product_type;
            let category = await this.fetchData('q_category_status', {});
            let refguid = category[0].GUID;
            let ax = await this.fillFeedbackData(catid, refguid); // function to return all category data related to present product type
            console.log('4-succesfully returned cateogry data')
            //    console.log(ax);
            let bx = ax.map(o => ({ catid: o.cat_id, catdesc: o.cat_desc, guid: o.guid, ref: o.ref_guid })) // final data set required for present line items feedback
            // console.log(bx); // final data set required for present line items. 
            await this.tm.getTN('categoryData').setData(bx); //setting data to other type tn for furhter use

            // till above line of code we get the category data , from there we need to fill the least level feedback  vh 
            const referencedGuids = new Set(bx.map(item => item.ref));
            const lastLevels = bx.filter(item => !referencedGuids.has(item.guid)); // to get the last level of hierarchal data
            // console.log(`lastlevels:${lastLevels}`);

            let level4 = lastLevels.map(tech => ({ guid: tech.guid, catid: tech.catid, catname: tech.catdesc, ref: tech.ref }));
            let level = this.tm.getTN('visible').getData();
            let datapath = "data" + level
            await this.tm.getTN(datapath).setData(level4); //setting the last level of data to other type tn for manual vh
            let fx = bx.filter(o => o.catid == catid);
            let cdatax = fx[0].catdesc
            levelValue = 1;
            catname[levelValue - 1] = cdatax; //level 1 category description
            await this.tm.getTN('hierarchy').setProperty("level1", catid); // setting level 1;
            await this.tm.getTN("CatVisible").setData("1"); //controls the visibilty of category section
            codeControlFlag = 0;
            await this.tm.getTN('codeControlFlag').setData(codeControlFlag);
            // let category = await this.fetchData('q_category_status', {});
            // let refguid = category[0].GUID;
            // levelValue = 1;

            // let categoryData = await this.fetchData('q_category_data', { ref_guid: refguid, cat_id: catid });
            // let f = categoryData.filter(o => o.cat_id == catid);
            // let cdata = f[0].cat_desc  //level 1 description 
            // await this.tm.getTN("CatVisible").setData("1");
            // let tech_data = categoryData.map((tech) => ({ guid: tech.guid, catid: tech.cat_id, catname: tech.cat_desc }));
            // await this.tm.getTN('data1').setData(tech_data);
            // catname[levelValue - 1] = cdata;

        }
    }

    public async onfeedbackpress(oEvent) {
        // now on each item feedback button press this funciton gets called ,, the user can select any level..

        let ln = this.getPathFromEvent(oEvent);  // to get index of list frin where event is trigered
        Activeindex = Number(ln.split('/').pop());
        await this.tm.getTN('item').setActive(Activeindex);

        await this.partOfFeedbackPress();

        await this.openDialog('pa_item_detail');


        let l = await this.tm.getTN('item_detail').getData().feedback;
        if (l) {
            let len = l.length
            if (len > 0) {
                let f = categoryData.filter(o => o.catid == l)
                await this.tm.getTN('detailCatName').setData(f[0].catdesc)
            }
        }

    }


    public async partOfFeedbackPress() {
        //privatenode
        let busyIndicator = new sap.m.BusyDialog();
        busyIndicator.setText('.....Loading');
        busyIndicator.open();



        let data = await this.tm.getTN('detail').getData();
        let t = await this.fetchData('d_product', { product_id: data.product_id }); // to get product type in order to fetch the related category data
        let catid = t[0].product_type;
        let category = await this.fetchData('q_category_status', {});
        let refguid = category[0].GUID;
        let ax = await this.fillFeedbackData(catid, refguid); //function to return the required category data (based on present product type it returns)
        console.log('succesfully returned cateogry data');
        if (ax.length == 0) console.log('No Category Data Found'); //for dev testing
        let bx = ax.map(o => ({ catid: o.cat_id, catdesc: o.cat_desc, guid: o.guid, ref: o.ref_guid }))
        console.log(bx);
        const allGuids = bx.map(item => item.guid);
        const level1 = bx.filter(item => !allGuids.includes(item.ref));  // to find the root node in category data
        let levels = {};
        let currentLevel = level1;
        let levelIndex = 2;
        while (currentLevel.length > 0) {  // to segragate the levels data in order to set it to manual vh's
            const nextLevel = bx.filter(item =>
                currentLevel.some(parent => parent.guid === item.ref)
            );
            if (nextLevel.length > 0) {
                levels[`level${levelIndex}`] = nextLevel;
                currentLevel = nextLevel;
                levelIndex++;
            } else {
                break;
            }
        }
        console.log(levels);  //returns all the levels data
        globalLevelData = levels
        // Loop through all levels dynamically
        Object.keys(levels).forEach((levelKey, index) => {
            // Construct the datapath dynamically
            const datapath = `data${index + 2}`; // Start with data2 for level2

            // Get the respective level data
            const levelData = levels[levelKey];
            let tech_data = levelData.map((tech) => ({ guid: tech.guid, catid: tech.catid, catname: tech.catdesc, ref: tech.ref }));
            // Set the data using the desired method
            this.tm.getTN(datapath).setData(tech_data);  // setting each levels data(from level 2) to respective other type tns ('data1',data2....)
        });
        codeControlFlag = 1;
        await this.tm.getTN("CatVisible").setData("1"); // to control visibilty of the category section : actually not needed but need to change later

        await this.tm.getTN('hierarchy').setProperty("level1", catid); // to set level 1 data (always it will be hardcoded)
        let tt = level1.map((tech) => ({ guid: tech.guid, catid: tech.catid, catname: tech.catdesc }));
        catname[0] = tt[0].catname;
        await this.tm.getTN('data1').setData(tt);
        await this.tm.getTN('categoryData').setData(bx); //setting data to other type tn for furhter use
        categoryData = bx; // setting to use in newChange()
        busyIndicator.close();
    }

    public async newVhRequest(oEvent) { // triggers when the user clicks vh icon (this function will trigger on vh press used in item flow) 
        let path = oEvent.mParameters.id;
        let num = Number(path.slice(-1));
        let maxLevel = await this.tm.getTN('visible').getData();
        levelValue = num; // setting the path of event for further use
        if (2 < levelValue) { // for level value greater than 2 this logic applies; y bcoz always the level will be based on level 1 which is not editable at all
            let data = categoryData;
            let previouslevel = levelValue - 1;
            let datapath = "data" + levelValue
            let lev = "level" + previouslevel
            let a = this.getActiveControlById(lev, "s_item_category")
            let b = a.mProperties.selectedKey
            //we can collapse this logic if the customer wants all the data all the time in vhs
            if (b.length > 0) { // if previous level is filled means then the present level vh data will be based on the previous level
                let filter = data.filter(o => o.catid == b);
                let guid = filter[0].guid;
                let dx = data.filter(o => o.ref == guid);

                let tech_data = dx.map((tech) => ({ guid: tech.guid, catid: tech.catid, catname: tech.catdesc, ref: tech.ref }));
                await this.tm.getTN(datapath).setData(tech_data);

            }
            else {
                // else all the data of particular level will be available in vh 
                const levelDat = globalLevelData[`level${levelValue}`];
                console.log(levelDat);
                let tech_data = levelDat.map((tech) => ({ guid: tech.guid, catid: tech.catid, catname: tech.catdesc, ref: tech.ref }));
                await this.tm.getTN(datapath).setData(tech_data);
            }
        }
    }

    public async newChange(oEvent) {

        // on selecting the feedback ;; to set data to further level's vh
        let key = oEvent.oSource.mProperties.selectedKey; // the selected key on vh
        let leastLevel = 2;
        let maxLevel = await this.tm.getTN('visible').getData();
        let datapath = 'data' + levelValue;
        let data = await this.tm.getTN(datapath).getData();
        let filterData = data.filter(o => o.catid == key);
        catname[levelValue - 1] = filterData[0].catname; //we are setting description manully every time to "catname" other type tn


        if (levelValue >= 2) {
            let datax = categoryData;
            let currentRef = filterData[0].ref;
            // if level > 2 is selected then auto fills the previous levels (..higher than the current level)data
            for (let i = levelValue - 2; i > 0; i--) {
                let parentNode = datax.find(o => o.guid === currentRef);
                if (parentNode) {
                    // Set the catname for the current level
                    catname[i] = parentNode.catdesc;
                    let lev = "level" + (i + 1);

                    await this.tm.getTN('hierarchy').setProperty(lev, parentNode.catid);
                    // Update currentRef to the parent's ref
                    currentRef = parentNode.ref;
                } else {
                    // Break the loop if no parent is found
                    break;
                }
            }

            // and should clear below levels 
            let upper = levelValue + 1
            for (upper; upper <= maxLevel; upper++) {
                delete catname[upper - 1];
                let p = "data" + upper;
                await this.tm.getTN(p).setData(); // to clear higher level vhs
                let a = await this.tm.getTN('hierarchy').getData()
                delete a[`level${upper}`];

                // if required > if any potential issues are caused need to clear hierarchial data in further
            }

        }

    }
    public async onPreviousButton() {
        // let act_index = this.tm.getTN('item').getActiveIndex();


        //Added By Venkatesh on 23/04/25==>CODE START

        let curr_item = await this.tm.getTN('item_detail').getData();
        let heirarchyData = await this.tm.getTN('hierarchy').getData();
        if (global_item_qty != curr_item.qty || heirarchyData.level4 != curr_item.feedback || !heirarchyData) {
            await this.onUpdateFeedBack();
        }


        //Added By Venkatesh on 23/04/25<==CODE END




        let current = Activeindex - 1;



        if (current >= 0) {
            let ax = await this.tm.getTN('hierarchy').getData();
            let cat = catname[0]
            let catid = ax[`level${1}`];
            await this.tm.getTN('item').setActive(current);

            // Added By Venkatesh on 22/04/25==>CODE START

            await this.onDialogOpen();

            //Added By Venkatesh on 22/04/25<==CODE END



            Activeindex = current;
            let search: Array<{ "level1": string, "level2": string, "level3": string, "level4": string, "level5": string, "level6": string, "level7": string, "level8": string, "level9": string, "level10": string }> = [];
            catname = [];
            await this.tm.getTN('catname').setData(catname);
            await this.tm.getTN('hierarchy').setData(search);
            await this.tm.getTN('hierarchy').setProperty("level1", catid);
            catname[0] = cat;
            let l = await this.tm.getTN('item_detail').getData().feedback;
            if (l) {
                let len = l.length
                if (len > 0) {
                    let f = categoryData.filter(o => o.catid == l)
                    await this.tm.getTN('detailCatName').setData(f[0].catdesc)
                }
            }

            // Added By Venkatesh on 22/04/25==>CODE START

            await this.onCategoryEnter();

            // Added By Venkatesh on 22/04/25<==CODE END  

        }
        else {
            sap.m.MessageToast.show('Reached start of the List');
        }

    }
    /* public async onNextButton() {
         let current;
 
         current = Activeindex + 1;
 
         // Added By Venkatesh on 22/04/25==>CODE START
 
         await this.onCategoryEnter();
 
         // Added By Venkatesh on 22/04/25<==CODE END
 
         let len = (await this.tm.getTN('item').getData()).length;
         if (current < len) {
             let ax = await this.tm.getTN('hierarchy').getData();
             let cat = catname[0]
             let catid = ax[`level${1}`];
             this.tm.getTN('item').setActive(current);
             Activeindex = current;
             let search: Array<{ "level1": string, "level2": string, "level3": string, "level4": string, "level5": string, "level6": string, "level7": string, "level8": string, "level9": string, "level10": string }> = [];
             catname = [];
             await this.tm.getTN('catname').setData(catname);
             await this.tm.getTN('hierarchy').setData(search);
             await this.tm.getTN('hierarchy').setProperty("level1", catid);
             catname[0] = cat;
             let l = await this.tm.getTN('item_detail').getData().feedback
 
             if (l) {
 
                 let len = l.length
                 if (len > 0) {
                     let f = categoryData.filter(o => o.catid == l)
                     await this.tm.getTN('detailCatName').setData(f[0].catdesc)
                 }
             }
             else {
                 await this.tm.getTN('detailCatName').setData();
             }
         }
         else {
             sap.m.MessageToast.show('Reached End of the List');
         }
 
     } */



    public async onNextButton() {
        let current;

        //Added By Venkatesh on 23/04/25==>CODE START

        let curr_item = await this.tm.getTN('item_detail').getData();
        let heirarchyData = await this.tm.getTN('hierarchy').getData();
        if (global_item_qty != curr_item.qty || heirarchyData.level4 != curr_item.feedback || !heirarchyData) {
            await this.onUpdateFeedBack();
        }


        //Added By Venkatesh on 23/04/25<==CODE END

        current = Activeindex + 1;



        let len = (await this.tm.getTN('item').getData()).length;
        if (current < len) {
            let ax = await this.tm.getTN('hierarchy').getData();
            let cat = catname[0]
            let catid = ax[`level${1}`];
            await this.tm.getTN('item').setActive(current);

            // Added By Venkatesh on 22/04/25==>CODE START

            await this.onDialogOpen();   // to set the original item qty

            //Added By Venkatesh on 22/04/25<==CODE END



            Activeindex = current;
            let search: Array<{ "level1": string, "level2": string, "level3": string, "level4": string, "level5": string, "level6": string, "level7": string, "level8": string, "level9": string, "level10": string }> = [];
            catname = [];
            await this.tm.getTN('catname').setData(catname);
            await this.tm.getTN('hierarchy').setData(search);
            await this.tm.getTN('hierarchy').setProperty("level1", catid);
            catname[0] = cat;
            let l = await this.tm.getTN('item_detail').getData().feedback

            if (l) {

                let len = l.length
                if (len > 0) {
                    let f = categoryData.filter(o => o.catid == l)
                    await this.tm.getTN('detailCatName').setData(f[0].catdesc)
                }
            }
            else {
                await this.tm.getTN('detailCatName').setData();
            }
            // Added By Venkatesh on 22/04/25==>CODE START

            await this.onCategoryEnter();

            // Added By Venkatesh on 22/04/25<==CODE END
        }
        else {
            sap.m.MessageToast.show('Reached End of the List');
        }

    }




    /* public async onUpdateFeedBack() {
 
          // Added By Venkatesh on 22/04/25==>CODE START
 
         let item = await this.tm.getTN('item_detail').getData();
         let curr_qty = item.qty;
         if(curr_qty != global_item_qty ){
             let diff = curr_qty - global_item_qty;
            let tech_stock = await this.tm.getTN('list_tech_stock').getData();
 
          //  let filtered_stock = tech_stock.filter(stock => stock.product_id === item.spare_part);
            for(let data of tech_stock){
             if(data.product_id == item.spare_part){
                 data.qty = data.qty - diff;
                 // now update the global item qty as well to current qty
                 global_item_qty = curr_qty;  
             }
            }
            //filtered_stock.qty = filtered_stock.qty - diff;
         }
 
          //Added By Venkatesh on 22/04/25<==CODE END
 
 
 
         let ax = await this.tm.getTN('hierarchy').getData();
 
 
         let max = await this.tm.getTN('visible').getData()
         let catid = ax[`level${max}`];
         if (! catid || catid.length <= 0){  // ! catid added to handle case where catid is undefined
 
             // Code Added by Venkatesh on 23/04/25==>CODE START
 
             await this.tm.getTN('item_detail').setProperty('feedback', '');   // to handle reset feedback & save case
 
 
             let ilen = await this.tm.getTN('item').getData().length;
 
             if (Activeindex < (ilen - 1)) {
                 await this.onNextButton();
             }
             else {
                 sap.m.MessageToast.show('Reached End of the List');
                 if (ilen == 1) {
                     this.closeDialog('pa_item_detail');
                 }
             }
 
 
             // Code Added By Venkatesh on 23/04/25<==CODE END
 
             return;
         }   
         let cx = categoryData.filter(o => o.catid == catid);
         let cat = cx[0].catdesc
         await this.tm.getTN('item_detail').setProperty('feedback', catid);
         await this.tm.getTN('detailCatName').setData(cat);
         let ilen = await this.tm.getTN('item').getData().length
         await this.wait(1000);
 
 
 
         if (Activeindex < (ilen - 1)) {
             await this.onNextButton();
         }
         else {
             sap.m.MessageToast.show('Reached End of the List');
             if (ilen == 1) {
                 this.closeDialog('pa_item_detail');
             }
         }
     }*/


    public async onUpdateFeedBack() {

        // Added By Venkatesh on 22/04/25==>CODE START

        let item = await this.tm.getTN('item_detail').getData();
        let curr_qty = item.qty;
        if (curr_qty != global_item_qty) {
            let diff = curr_qty - global_item_qty;
            let tech_stock = await this.tm.getTN('list_tech_stock').getData();

            //  let filtered_stock = tech_stock.filter(stock => stock.product_id === item.spare_part);
            for (let data of tech_stock) {
                if (data.product_id == item.spare_part) {
                    data.qty = data.qty - diff;
                    // now update the global item qty as well to current qty
                    global_item_qty = curr_qty;
                }
            }
            //filtered_stock.qty = filtered_stock.qty - diff;
        }

        //Added By Venkatesh on 22/04/25<==CODE END



        let ax = await this.tm.getTN('hierarchy').getData();


        let max = await this.tm.getTN('visible').getData()
        let catid = ax[`level${max}`];
        if (!catid || catid.length <= 0) {  // ! catid added to handle case where catid is undefined

            // Code Added by Venkatesh on 23/04/25==>CODE START

            await this.tm.getTN('item_detail').setProperty('feedback', '');   // to handle reset feedback & save case


            let ilen = await this.tm.getTN('item').getData().length;




            // Code Added By Venkatesh on 23/04/25<==CODE END

            return;
        }
        let cx = categoryData.filter(o => o.catid == catid);
        let cat = cx[0].catdesc
        await this.tm.getTN('item_detail').setProperty('feedback', catid);
        await this.tm.getTN('detailCatName').setData(cat);
        let ilen = await this.tm.getTN('item').getData().length
        await this.wait(1000);



        if (Activeindex < (ilen - 1)) {
            await this.onNextButton();
        }
        else {
            sap.m.MessageToast.show('Reached End of the List');
            if (ilen == 1) {
                this.closeDialog('pa_item_detail');
            }
        }
    }





    public async wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    public async onResetButton() {
        let ax = await this.tm.getTN('hierarchy').getData();
        let cat = catname[0]
        let catid = ax[`level${1}`];
        let search: Array<{ "level1": string, "level2": string, "level3": string, "level4": string, "level5": string, "level6": string, "level7": string, "level8": string, "level9": string, "level10": string }> = [];
        catname = [];
        await this.tm.getTN('catname').setData(catname);
        await this.tm.getTN('hierarchy').setData(search);
        await this.tm.getTN('hierarchy').setProperty("level1", catid);
        catname[0] = cat;

        // Added by Venkatesh on 22/04/25==>CODE START

        let item = await this.tm.getTN('item_detail').getData();
        item.feedback = '';
        // Added by Venkatesh on 22/04/25<==CODE END
    }

    public async fillFeedbackData(catid, refguid) { // now not in use i guess..like old flow of the feeback
        console.log('3-succesfully entered fillFeedbackData function (which returns the category data)')
        let categoryData = await this.fetchData('d_category_data'); // getting all the data from d_category_data table
        const root = categoryData.find(item => item.ref_guid === refguid && item.cat_id === catid); //finding the root node by passing refguid and catid(product type) based on present product
        if (!root) return [];
        function collectChildren(refguid: string) {  //  returns the children for the above root
            const children = categoryData.filter(item => item.ref_guid === refguid);
            // console.log(`children:${children}`);
            // const descendants = children.flatMap(child => collectChildren(child.guid));
            // const descendants = children.map(child => collectChildren(child.guid)).flat();
            let descendants = [];

            // Recursively gather descendants for each child
            for (const child of children) {
                // Get all descendants of the current child and append them to descendants array
                descendants = descendants.concat(collectChildren(child.guid));
                // console.log(`Descandants:${descendants}`)
            }
            // console.log(children.concat(descendants));
            return children.concat(descendants);
        }

        return [root, ...collectChildren(root.guid)];
    }
    public async onVhRequest1() { // for line items feedback 1 // not  in use 
        let category = await this.fetchData('q_category_status', {});
        let refguid = category[0].GUID;
        let categoryData = await this.fetchData('q_category_data', { ref_guid: refguid });
        // let data = categoryData[0];
        let tech_data = categoryData.map((tech) => ({ guid: tech.guid, catid: tech.cat_id, catname: tech.cat_desc }));
        await this.tm.getTN('data1').setData(tech_data);
        levelValue = 1; // to pass flag to onChange event 
    }
    public async onSpareChange(oEvent) {
        let event = oEvent.oSource.mProperties.selectedKey;

        let data = await this.tm.getTN('detail').getData().product_id;
        let detail = await this.tm.getTN('detail').getData();
        let stck = await this.tm.getTN('list_tech_stock').getData();
        stck.filter(o => o.product_id == event);
        let desc = stck[0].product_desc;
        await this.tm.getTN('item_detail').setProperty("spare_part_desc", desc);
        f_sno_vh = 1; // to set serial no manual vh if user selectes spare part from the vh instead of scan
        if (f_sno_vh == 1) {

            let dataserial = await this.fetchData('d_serial_master', { product_id: event, employee_id: detail.technician });
            if (dataserial.length > 0) {
                let item = await this.tm.getTN('item').getData();
                let existing_serial = await this.fetchData('q_notresolved'); // to check whether exists in some other complaints
                let arr1 = Array.from(existing_serial.map(o => o.serial_number));

                let existing_serial_id = item.map(o => o.serial_number); //to check in active complaint
                let arr = Array.from(existing_serial_id);
                let mergedArray = arr1.concat(arr);
                let vh = dataserial.map(o => ({ key: o.serial_number, desc: o.serial_number }))
                let filteredvh = vh.filter(o => !mergedArray.includes(o.key))
                await this.tm.getTN('serial_vh').setData(filteredvh);
                await this.partOfFeedbackPress();

                if (filteredvh.length == 0) { // means serial no already used.
                    sap.m.MessageToast.show('Serial No Not found for selected spare');
                }
            }
            else {
                sap.m.MessageToast.show('Serial No Not found for selected spare');
                await this.tm.getTN('serial_vh').setData();
            }
        }

        // to set category data level 1 value
        // ----- commenting from here to 
        // let t = await this.fetchData('d_product', { product_id: data });
        // let catid = t[0].product_type;
        // await this.tm.getTN('hierarchy').setProperty("level1", catid);
        // let category = await this.fetchData('q_category_status', {});
        // let refguid = category[0].GUID;
        // levelValue = 1;

        // let categoryData = await this.fetchData('q_category_data', { ref_guid: refguid, cat_id: catid });
        // let f = categoryData.filter(o => o.cat_id == catid);
        // let cdata = f[0].cat_desc
        // await this.tm.getTN("CatVisible").setData("1");
        // let tech_data = categoryData.map((tech) => ({ guid: tech.guid, catid: tech.cat_id, catname: tech.cat_desc }));
        // await this.tm.getTN('data1').setData(tech_data);
        // catname[levelValue - 1] = cdata;



        //// -- here
        codeControlFlag = 1// to control the vh select and vh change of category levels
    }
    // public async onSuggestItemSelect(oEvent){
    //     console.log(oEvent);
    // }
    // public async onitemDetailSecEnter () {
    //     let l = await this.tm.getTN('item_detail').getData().feedback;
    //     let len = l.length;
    //     console.log(len);
    //     console.log(categoryData);
    // }
    public async onSaveItemDetail() {
        let complaint_guid = await this.tm.getTN('detail').guid;
        let item_data = await this.fetchData('q_complaint_item', { guid: complaint_guid });
        // if(item_data.length == 0){
        //     await this.tm.getTN('item_detail').setProperty('item_id',10);
        // }
        // else if(item_data.length > 0){
        //     let maxid =10;
        //     for (const item of item_data) {
        //         let present_id=item.item_id;
        //         if(present_id > maxid){
        //             maxid = parseInt(present_id);
        //         }

        //     }
        //     let itemid:Number = maxid + 10;
        //     await this.tm.getTN('item_detail').setProperty('item_id',itemid);

        // }
        let desc = await this.getActiveControlById('spare_part_desc', 's_item_detail');
        let description = desc.mProperties.selectedKey;

        let level = await this.tm.getTN('visible').getData() // to get the level to pick last feedback
        // let a = 'data' + level;
        let d = await this.tm.getTN('hierarchy').getData();
        // await this.tm.getTN(a).getData();
        let prop = 'level' + level;
        let a = this.getActiveControlById(prop, 's_item_category');
        let b = a.mProperties.selectedKey;
        await this.tm.getTN('item_detail').setProperty('feedback', b);
        if (codeControlFlag == 1) { await this.tm.getTN('item_detail').setProperty('spare_part_desc', description); }

        // await this.tm.commitP("Saved Successfully", "Save Failed", false, true);
        let search: Array<{ "level1": string, "level2": string, "level3": string, "level4": string, "level5": string, "level6": string, "level7": string, "level8": string, "level9": string, "level10": string }> = [];
        catname = [];
        await this.tm.getTN('catname').setData(catname);
        await this.tm.getTN('hierarchy').setData(search);
        codeControlFlag = 0;
        this.closeDialog('pa_item_detail');

    }
    public async onVhRequest2(oEvent) {
        if (codeControlFlag == 1) {
            let path = oEvent.mParameters.id;
            let num = path.slice(-1);
            let lastDigit = parseInt(num) - 1;
            let prop: string = 'data' + lastDigit;
            let tn = 'data' + num;
            // let a = this.getActiveControlById(prop,'s_item_detail');
            // let b =a.mProperties.selectedKey;
            // const a = await this.tm.getTN('hierarchy').getData();
            levelValue = num; // to pass flag to onChange event 


            // switch (num) {
            //     case 1:
            //     levelValue = a.level1;
            //     break;
            //     case 2:
            //     levelValue = a.level2;
            //     break;
            //     case 3:
            //     levelValue = a.level3;
            //     break;
            //     case 4:
            //     levelValue = a.level4;
            //     break;
            //     case 5:
            //     levelValue = a.level5;
            //     break;
            //     case 6:
            //     levelValue = a.level6;
            //     break;
            //     case 7:
            //     levelValue = a.level7;
            //     break;
            //     case 8:
            //     levelValue = a.level8;
            //     break;
            //     case 9:
            //     levelValue = a.level9;
            //     break;
            //     case 10:
            //     levelValue = a.level10;
            //     break;
            //     default:
            //     throw new Error("Invalid level number");
            // }
            let level = 'level' + lastDigit;
            let a = this.getActiveControlById(level, 's_item_category');
            let levelvalue = a.mProperties.selectedKey;
            let data = this.tm.getTN(prop).getData();
            let b = data.filter(o => o.catid == levelvalue)
            let c = b[0].guid

            let categoryData = await this.fetchData('q_category_data', { ref_guid: c });
            let tech_data = categoryData.map((tech) => ({ guid: tech.guid, catid: tech.cat_id, catname: tech.cat_desc }));
            await this.tm.getTN(tn).setData(tech_data);
        }
        else {
            let path = oEvent.mParameters.id;
            let num = path.slice(-1);
            levelValue = num;
        }

    }
    public async onChange(oEvent, oAction) {
        let key = oEvent.oSource.mProperties.selectedKey;
        if (codeControlFlag == 1) {
            console.log(oEvent, oAction)

            // let t = 'level'+levelValue;
            let datapath = 'data' + levelValue;

            // let key  = 'WM';
            let data = await this.tm.getTN(datapath).getData();
            let filterData = data.filter(o => o.catid == key);


            //    datSet[levelValue - 1] = filterData[0].catname;
            catname[levelValue - 1] = filterData[0].catname;
            console.log('datSet');
            //    await this.tm.getTN(datapath).setData(filterData);
        }
        else {
            let datapath = 'data' + levelValue;
            // let key = oEvent.oSource.mProperties.selectedKey;
            let data = await this.tm.getTN(datapath).getData();
            let filterData = data.filter(o => o.catid == key);
            catname[levelValue - 1] = filterData[0].catname;

            let datax = await this.tm.getTN("categoryData").getData();
            let currentRef = filterData[0].ref;
            for (let i = levelValue - 2; i > 0; i--) {
                let parentNode = datax.find(o => o.guid === currentRef);
                if (parentNode) {
                    // Set the catname for the current level
                    catname[i] = parentNode.catdesc;
                    let lev = "level" + (i + 1);

                    await this.tm.getTN('hierarchy').setProperty(lev, parentNode.catid);
                    // Update currentRef to the parent's ref
                    currentRef = parentNode.ref;
                } else {
                    // Break the loop if no parent is found
                    break;
                }
            }


        }
    }
    public async onAccept() {
        // if dealer accepts complaint then status updates and if serial no is available means the warranty details will gets filled automatically..
        await this.tm.getTN('detail').setProperty('status', 'SR_00200')
        // let d =this.getActiveControlById('Reject','s_detail_header');
        // d.setVisible(false);
        // let e =this.getActiveControlById('Accept','s_detail_header');
        // e.setVisible(true);
        let data = await this.tm.getTN('detail').getData();
        let sno = data.serial_number
        let dateTime = new Date();
        await this.transaction.createEntityP('d_appointment', { complaint_id: data.guid, appt_type: "AR", date_time: dateTime });//  actual response

        let existing_product_id = await this.tm.getTN('detail').getData().product_id;
        if (sno) {
            let productData = await this.fetchData('q_equipment_master', { serial_no: sno, product_id: existing_product_id });
            if (productData.length > 0) {

                let dop = productData[0].date_of_purchase;
                await this.fillproductdetail(existing_product_id, dop);
            }

        }

        await this.tm.commitP();
        acceptFlag = 1;
    }
    public async onReject() {
        await this.openDialog('pa_remark_dialog');
        // await this.tm.getTN('detail').setProperty('status', 'SR_00300');
        // await this.tm.getTN('detail').setProperty("technician", "") //remove the techninician from complaint
        // // let d =this.getActiveControlById('Accept','s_detail_header');
        // // d.setVisible(false);
        // // let e =this.getActiveControlById('Reject','s_detail_header');
        // // e.setVisible(true);
        // await this.tm.commitP();
        // rejectFlag = 1;
    }

    public async onRejectSave() {
        await this.tm.getTN('detail').setProperty('status', 'SR_00300');
        await this.tm.getTN('detail').setProperty("technician", "") //remove the techninician from complaint
        // let d =this.getActiveControlById('Accept','s_detail_header');
        // d.setVisible(false);
        // let e =this.getActiveControlById('Reject','s_detail_header');
        // e.setVisible(true);
        await this.tm.commitP();
        rejectFlag = 1;
        await this.closeDialog('pa_remark_dialog');
    }




    public async onNotes_type_section_enter(oEvent) {
        await this.tm.getTN('placeholder').setData();
        let active_data = await this.tm.getTN('detail').getData();
        // let issues = await active_data.toissuenote?.fetch();
        let q2 = await this.transaction.getQueryP('d_issue_notes');
        q2.setLoadAll(true);
        q2.setSkipMap(true);  // to always fire query and not fetch from cache
        q2.ref_guid = active_data.guid;
        let issues = await q2.executeP();
        if (issues.length) {
            for (let data of issues) {
                if (data.note_type == 'PD' || data.note_type == 'RD') {
                    let d = this.getActiveControlById('add', 's_notes_header');
                    let m = this.getSubscreenControl('s_notes_header');
                    m.setVisible(true);
                    console.log(d.mProperties.visible);
                    d.setVisible(false);
                } else {
                    let d = this.getActiveControlById('add', 's_notes_header');
                    // let m = this.getSubscreenControl('s_notes_header');
                    let m = this.getActiveControlById('issue_note', 's_notes_header');
                    m.setVisible(false);
                    console.log(d.mProperties.visible);
                    d.setVisible(false);
                }
            }
        } else {
            let d = this.getActiveControlById('add', 's_notes_header');
            // let m = this.getSubscreenControl('s_notes_header');
            // m.setVisible(false);
            let m = this.getActiveControlById('issue_note', 's_notes_header');
            m.setVisible(false);
            console.log(d.mProperties.visible);
            d.setVisible(false);
        }
        let m = this.getActiveControlById('show_data', 's_notes_header');
        m.setVisible(false);


        // Added By Venkatesh to defaultly set Summary when entering notes section

        await this.tm.getTN('selected_note_type').setData('AL');
        await this.onTypeSelect();

    }
    // public async servicecenter(product_id: string, customer_id: string) {
    //     // Step 1: Fetch product information using product_id
    //     let productData = await this.fetchData('q_product', { product_id });
    //     let brand = productData[0].brand;

    //     // Step 2: Fetch service centers and filter by brand
    //     let servicecenterData = await this.fetchData('q_service_brand');


    //     let filteredServicecenters = servicecenterData.filter((center: any) => {

    //     // Log the brand to debug
    //         console.log('Center Brand:', center.brand);

    //         // Ensure center.brand is a string and split it into an array
    //         const brandString = typeof center.brand === 'string' ? center.brand.trim() : '';
    //         const brands = brandString ? brandString.split(',') : [];

    //         // Check if the desired brand is in the array
    //         return brands.includes(brand);
    //     });

    //     // Step 3: Get filtered service center IDs
    //     let filteredServiceCenterIds = new Set(
    //         filteredServicecenters.map((item: any) => item.service_center_id)
    //     );
    //     let serviceCenterIdsArray = Array.from(filteredServiceCenterIds);

    //     // Step 4: Fetch customer GUID using customer_id
    //     let customerData = await this.fetchData('d_customer', { customer_id });
    //     let cust_guid = customerData[0].guid;

    //     // Step 5: Fetch customer address using the GUID
    //     let customerAddressData = await this.fetchData('q_address_complaint', { guid: cust_guid });
    //     let customerAddress = customerAddressData[0];

    //     // Step 6: Fetch service center addresses using filtered service center IDs
    //     let servicecenterAddressData = await this.fetchData('q_service_address', { guid: serviceCenterIdsArray });
    // console.log(servicecenterAddressData);
    //     // debugger;
    //     // Your remaining logic or return the fetched data
    //     const matchServiceCenters = (address: any, centers: any[]) => {
    //         return centers.filter((center: any) => {
    //             const centerPincode = center.postal_code;
    //             const centerLocality = center.locality;
    //             const centerCity = center.city;
    //             // debugger;
    //             // Match 1: pincode, locality, city
    //             if (centerPincode == address.postal_code &&
    //                 centerLocality == address.locality &&
    //                 centerCity== address.city) {
    //                     // debugger;
    //                 return true;

    //             }
    //             // Match 2: locality, city
    //             if (centerLocality== address.locality &&
    //                 centerCity == address.city) {
    //                     // debugger;
    //                 return true;

    //             }
    //             // Match 3: city
    //             if (centerCity == address.city) {
    //                 // debugger;
    //                 return true;

    //             }

    //             // No need to match by brand, as service centers are already filtered by brand
    //             return false;
    //         });
    //     };

    //     let matchedServiceCenters = await  matchServiceCenters(customerAddress, servicecenterAddressData);
    //     console.log('centers matched:',matchedServiceCenters);

    //     // Return or use matched service centers as needed
    //     // return matchedServiceCenters;
    //     let centersLength = matchedServiceCenters.length;
    //     console.log('center length:',centersLength);

    //     if(centersLength == 0){
    //     //    let  addressData = servicecenterAddressData;
    //     //    const bestServiceCenter = await this.findNearestServiceCenter(addressData,customerAddress);
    //     //    let service_center =bestServiceCenter.nearestServiceCenter.guid;
    //     //    let service_center_id = this.tm.getTN('detail').setProperty("service_center",service_center);
    //     //    const dealer = await this.fetchData('q_sc_master_complaint', { service_center_id: service_center});
    //     //    let sc_dealer= this.tm.getTN('detail').setProperty("dealer",dealer[0].dealer);
    //     //    const bestTechician= await this.technician(service_center,brand);
    //     // //    let bestTech= this.tm.getTN('detail').setProperty("technician",bestTechician);   
    //     //    console.log(service_center_id,bestTech)
    //     sap.m.MessageToast.show('Service Center not available for mentioned address');

    //     }
    //     if(centersLength == 1){
    //         let service_center = matchedServiceCenters[0].guid;

    //         let service_center_id = this.tm.getTN('detail').setProperty("service_center",service_center);
    //         const dealer = await this.fetchData('q_sc_master_complaint', { service_center_id: service_center});
    //         let sc_dealer= this.tm.getTN('detail').setProperty("dealer",dealer[0].dealer);
    //         const bestTechician= await this.technician(service_center,brand);
    //         let bestTech= this.tm.getTN('detail').setProperty("technician",bestTechician); 
    //         console.log(service_center_id,bestTech)
    //     }
    //     if(centersLength > 1){
    //         let  addressData = matchedServiceCenters;
    //         const bestServiceCenter = await this.getServiceCenter(addressData);
    //         let service_center =bestServiceCenter.guid;
    //         // const bestServiceCenter = await this.findNearestServiceCenter(addressData,customerAddress);
    //         // let service_center =bestServiceCenter.nearestServiceCenter.guid;
    //         let service_center_id = this.tm.getTN('detail').setProperty("service_center",service_center);
    //         const dealer = await this.fetchData('q_sc_master_complaint', { service_center_id: service_center});
    //         let sc_dealer= this.tm.getTN('detail').setProperty("dealer",dealer[0].dealer);   
    //         const bestTechician= await this.technician(service_center,brand);
    //         let bestTech= this.tm.getTN('detail').setProperty("technician",bestTechician);
    //         console.log(service_center_id,bestTech)
    //         debugger;
    //     }


    // }   
    // public async oncustomerchange(){ // these are written for the initial flow of SC selection
    //     let product_id = this.tm.getTN('detail').getData().product_id;
    //     let customer_id = this.tm.getTN('detail').getData().customer_id;
    //     if(product_id != null && customer_id != null){
    //         console.log(1);
    //         await this.servicecenter(product_id,customer_id);
    //     }

    //  }




    // public async onproductchange(){  // these are written for the initial flow of SC selection
    //    let product_id = this.tm.getTN('detail').getData().product_id;
    //    let customer_id = this.tm.getTN('detail').getData().customer_id;
    //    if(product_id != null && customer_id != null){
    //     console.log(1)
    //     await this.servicecenter(product_id,customer_id)
    //    }

    // }

    public async onMEvents(oEvent) {
        let path = oEvent.mParameters.id;
        let ln = path.split('_').pop();
        let data = await this.tm.getTN('detail').getData();
        const now = new Date();
        let flag = 0;
        switch (ln) {
            case "accept":
                await this.tm.getTN('detail').setProperty("status", "SR_00500") //accepted by tech
                await this.transaction.commitP();

                this.getActiveControlById('accept', 'pa_mtab').setVisible(false);
                this.getActiveControlById('reject', 'pa_mtab').setVisible(false);
                this.getActiveControlById('StartTrip', 'pa_mtab').setVisible(true);
                this.getActiveControlById('reschedule', 's_mdetail').setVisible(true);
                break;
            case "reject":
                await this.openDialog('pa_m_remark_dialog');


                break;
            case "StartTrip": //start trip
                // await this.tm.getTN('detail').setProperty("status", "SR_01200") //start by tech
                await this.transaction.createEntityP('d_tech_trip', { complaint_id: data.complaint_number, tech_id: data.technician, trip_start: now });
                await this.transaction.commitP();
                this.getActiveControlById('StartTrip', 'pa_mtab').setVisible(false);
                this.getActiveControlById('EndTrip', 'pa_mtab').setVisible(true);
                break;
            case "EndTrip": //end trip
                await this.tm.getTN('detail').setProperty("status", "SR_00700") //
                let a = await this.fetchData("d_tech_trip", { complaint_id: data.complaint_number, tech_id: data.technician });
                if (a.length == 1) {
                    a[0].trip_end = now;
                }
                else if (a.length > 1) {
                    let filt = a.filter(o => o.trip_end == null);
                    filt[0].trip_end = now;
                }

                await this.transaction.commitP();
                this.getActiveControlById('inProcess', 'pa_mtab').setVisible(true);
                this.getActiveControlById('EndTrip', 'pa_mtab').setVisible(false);
                break;
            // case "ReachedAtSite": //Reached at Site
            //     await this.tm.getTN('detail').setProperty("status", "SR_00700") //
            //     await this.transaction.commitP();
            //     this.getActiveControlById('ReachedAtSite', 'pa_mtab').setVisible(false);
            //     this.getActiveControlById('inProcess', 'pa_mtab').setVisible(true);
            //     this.getActiveControlById('reschedule', 's_mdetail').setVisible(false);
            //     break;
            case "inProcess": //inprocess
                flag = 1; // to control edit button visibility
                await this.tm.getTN('detail').setProperty("status", "SR_00900") //
                let p = await this.fetchData('q_tech_startsla', { complaint_id: data.complaint_number, tech_id: data.technician })
                p[0].start_sla = now;
                await this.tm.getTN('ItemVisibility').setData("1")
                await this.transaction.commitP();
                this.getActiveControlById('inProcess', 'pa_mtab').setVisible(false);
                this.getActiveControlById('reschedule', 's_mdetail').setVisible(false);
                this.getActiveControlById('serial_no', 's_mdetail').setVisible(true);
                this.getActiveControlById('additinalInfo', 's_mdetail').setVisible(true);
                // this.getActiveControlById('pending', 'pa_mtab').setVisible(true);
                // this.getActiveControlById('resolved', 'pa_mtab').setVisible(true);
                //to control item section visibilty
                break;
            case "pending": //pending
                flag = 0;
                await this.tm.getTN('detail').setProperty("status", "SR_00800");
                await this.tm.getTN('ItemVisibility').setData("0")
                this.getActiveControlById('serial_no', 's_mdetail').setVisible(false);
                this.getActiveControlById('additinalInfo', 's_mdetail').setVisible(false);
                await this.onmSave();
                // await this.transaction.commitP();
                // this.getActiveControlById('pending', 'pa_mtab').setVisible(false)
                // this.getActiveControlById('resolved', 'pa_mtab').setVisible(true)
                break;
            case "resolved": //inprocess
                let date = new Date();
                await this.tm.getTN('detail').setProperty("resolved_date", now);
                await this.tm.getTN('detail').setProperty("status", "SR_01000")
                //resolved
                c = 0;
                await this.openDialog('pa_csat_dialog');

                // await this.onmSave()
                // await this.transaction.commitP();
                // this.getActiveControlById('edit', 'pa_mtab').setVisible(false)
                // this.getActiveControlById('resolved', 'pa_mtab').setVisible(false)
                break;


            default:
                break;
        }
        if (flag == 1) {
            this.getActiveControlById('edit', 'pa_mtab').setVisible(true);
        }
        else {
            this.getActiveControlById('edit', 'pa_mtab').setVisible(false);
        }

    }
    public async onmEdit() {

        let status = await this.tm.getTN('detail').getData().status;
        if (status == 'SR_00900') //inprocess
        {
            this.getActiveControlById('pending', 'pa_mtab').setVisible(true);
            this.getActiveControlById('resolved', 'pa_mtab').setVisible(true);
        }
        else if (status == "SR_00800") { //pending
            this.getActiveControlById('StartTrip', 'pa_mtab').setVisible(true);

        }

        this.setMode("EDIT");
        this.getActiveControlById('edit', 'pa_mtab').setVisible(false);
    }
    public async onmSave() {
        let now = new Date();
        let slaFlag = 0;
        let data = await this.tm.getTN('detail').getData();

        let status = await this.tm.getTN('detail').getData().status;
        switch (status) {
            case "SR_00800": //pending
                this.getActiveControlById('resolved', 'pa_mtab').setVisible(false);
                this.getActiveControlById('pending', 'pa_mtab').setVisible(false);
                this.getActiveControlById('StartTrip', 'pa_mtab').setVisible(false);
                await this.sla(data, now)
                await this.transaction.commitP();
                this.getActiveControlById('resolved', 'pa_mtab').setVisible(false);

                this.getActiveControlById('pending', 'pa_mtab').setVisible(false);
                await this.tm.getTN('ItemVisibility').setData("1")
                this.setMode('DISPLAY');
                (await this.getMessageBox()).information("Succesfully Saved")
                break;
            case "SR_01000":

                await this.sla(data, now);
                // await this.changeSerialMaster() shifted code to rule


                try {
                    await this.itemCheck(); // to check items stocks of a techincian at time of final complaint save
                    await this.tm.commitP("", "", false, true)
                    console.log('hi');
                    await this.closeDialog('pa_csat_dialog');
                    this.getActiveControlById('resolved', 'pa_mtab').setVisible(false);

                    this.getActiveControlById('pending', 'pa_mtab').setVisible(false);
                    await this.tm.getTN('ItemVisibility').setData("1")
                    this.setMode('DISPLAY');
                    (await this.getMessageBox()).information("Succesfully Saved")
                }

                catch (error) {
                    sap.m.MessageBox.error(error.message);
                    // await this.tm.getTN('detail').setProperty("status", "SR_00900");

                }

                break;
            case "SR_00900": //inprocess
                await this.transaction.commitP();
                this.getActiveControlById('edit', 'pa_mtab').setVisible(true);
                this.getActiveControlById('resolved', 'pa_mtab').setVisible(false);

                this.getActiveControlById('pending', 'pa_mtab').setVisible(false);
                await this.tm.getTN('ItemVisibility').setData("1")
                this.setMode('DISPLAY');
                (await this.getMessageBox()).information("Succesfully Saved")
                break;
            default:
                await this.transaction.commitP();
                (await this.getMessageBox()).information("Succesfully Saved")
                break;
        }







    }
    public async changeSerialMaster() {  // to update emplyoee id to customer id on serial master table
        // let cust_id = await this.tm.getTN('detail').getData().customer_id
        // let i = await this.tm.getTN('detail').getData().d_complaint_d_complaint_item?.fetch();
        // let product_id = i.map(o=> o.spare_part);
        // let serial_number =  i.map(o => o.serial_number);
        // let d = await this.fetchData('d_serial_master',{serial_number});
        // for (let i = 0; i < d.length; i++) {
        //     d[i].employee_id = cust_id;
        // }

    }
    public async itemCheck() {
        let i = await this.tm.getTN('detail').getData().d_complaint_d_complaint_item?.fetch();
        let d = await this.tm.getTN('detail').getData();
        let item = i.map(o => o.spare_part);
        if (i.length > 0) {
            let countMap = item.reduce((acc, part) => {
                acc[part] = (acc[part] || 0) + 1;
                return acc;
            }, {});
            let partCountArray = Object.entries(countMap).map(([part, count]) => ({
                spare_part: part,
                count: count
            }));
            console.log(partCountArray)

            let a = await this.fetchData("d_stock", { product_id: item, employee_id: d.technician });
            if (a) {
                let b = a.map(o => ({ spare_part: o.product_id, count: o.qty }));
                console.log(b);
                let missingParts = b.filter(o => o.count === 0);


                if (missingParts.length > 0) {
                    let partsWithZeroCount = partCountArray.filter(part => {
                        // Check if the spare_part exists in `b` and its count is 0
                        return missingParts.some(missing => missing.spare_part === part.spare_part);
                    });

                    let parts = partsWithZeroCount.map(o => o.spare_part)
                    throw new Error(`The following product's  ${parts} are out of stock`) // to check if any of product is out of stock
                }
                else {

                    let insufficientStockParts = partCountArray.filter(part => {
                        let stock = b.find(o => o.spare_part === part.spare_part);
                        return stock && part.count > stock.count;
                    });

                    if (insufficientStockParts.length > 0) {

                        let insufficientParts = insufficientStockParts.map(o => o.spare_part);
                        console.log(insufficientParts)
                        throw new Error(`The following product's ${insufficientParts} have insufficient stock`);
                    }
                    else {
                        for (let p of partCountArray) {
                            // await this.transaction.createEntityP('d_stock_log', { ref_id: d.complaint_number, product_id: p.spare_part, tech_id: d.technician, quantity: p.count });
                            // let stock = await this.fetchData('d_stock', { employee_id: d.technician, product_id: p.spare_part });
                            // stock[0].qty = parseInt(stock[0].qty, 10) - Number(p.count);
                        }
                    }
                }
            }

            else {
                console.log('stock has no record for technician') //its an rare case
            }
            // if (len == len2) {
            //     for (let p of item) {
            //         await this.transaction.createEntityP('d_stock_log', { ref_id: d.complaint_number, product_id: p, tech_id: d.technician, quantity: 1 });
            //         let stock = await this.fetchData('d_stock', { employee_id: d.technician, product_id: p });
            //         stock[0].qty = parseInt(stock[0].qty, 10) - 1;
            //     }

            // }
            // else {
            //     let result = item.filter(part => !b.includes(part));
            //     throw new Error(`The following product's  ${result} are out of stock`)
            // }
            console.log(a);
        }

    }
    public async sla(data, now) {
        let c = await this.fetchData('q_tech_stopsla', { complaint_id: data.complaint_number, tech_id: data.technician })
        c[0].stop_sla = now;
        let startc = c[0].start_sla
        const differenceInMs = now.getTime() - startc.getTime();
        const differenceInSeconds = Math.floor(differenceInMs / 1000);
        c[0].duration = differenceInSeconds;
    }
    public async onmCancel() {
        await this.transaction.rollback();
        this.getActiveControlById('pending', 'pa_mtab').setVisible(false);
        this.getActiveControlById('resolved', 'pa_mtab').setVisible(false);
        this.setMode('DISPLAY')
        let status = this.tm.getTN('detail').getData().status;
        if (status == 'SR_00900') {
            this.getActiveControlById('edit', 'pa_mtab').setVisible(true);
        }
    }

    public async onMEventsc(oEvent) {
        let path = oEvent.mParameters.id;
        let ln = path.split('_').pop();
        let data = await this.tm.getTN('detail').getData();
        const now = new Date();
        let flag = 0;
        switch (ln) {
            case "accept":
                await this.tm.getTN('detail').setProperty("status", "SR_00500");//accepted by tech
                await this.transaction.commitP();

                // Added By Venkatesh on 28/04/25==>CODE START

                await this.tm.getTN('current_timeline').setData('2');


                //Added By Venkatesh on 28/04/25<==CODE END

                this.getActiveControlById('accept', 's_mheader_copy_new').setVisible(false);
                this.getActiveControlById('reject', 's_mheader_copy_new').setVisible(false);
                this.getActiveControlById('StartTrip', 's_mheader_copy_new').setVisible(true);
                this.getActiveControlById('caller', 's_mheader_copy_new').setVisible(false);

                this.getActiveControlById('location', 's_mheader_copy_new').setVisible(false);

                this.getActiveControlById('reshchdeule', 's_mnappointment').setVisible(true);
                break;
            case "reject":
                await this.openDialog('pa_m_remark_dialog');
                this.getActiveControlById('caller', 's_mheader_copy_new').setVisible(false);

                this.getActiveControlById('location', 's_mheader_copy_new').setVisible(false);

                break;
            case "StartTrip": //start trip
                // await this.tm.getTN('detail').setProperty("status", "SR_01200") //start by tech
                await this.transaction.createEntityP('d_tech_trip', { complaint_id: data.complaint_number, tech_id: data.technician, trip_start: now });
                await this.transaction.commitP();

                // Added By Venkatesh on 28/04/25==>CODE START

                await this.tm.getTN('current_timeline').setData('3');


                //Added By Venkatesh on 28/04/25<==CODE END
                this.getActiveControlById('StartTrip', 's_mheader_copy_new').setVisible(false);
                this.getActiveControlById('EndTrip', 's_mheader_copy_new').setVisible(true);
                this.getActiveControlById('caller', 's_mheader_copy_new').setVisible(false);

                this.getActiveControlById('location', 's_mheader_copy_new').setVisible(false);
                break;
            case "EndTrip": //end trip
                await this.tm.getTN('detail').setProperty("status", "SR_00700") //
                let a = await this.fetchData("d_tech_trip", { complaint_id: data.complaint_number, tech_id: data.technician });
                if (a.length == 1) {
                    a[0].trip_end = now;
                }
                else if (a.length > 1) {
                    let filt = a.filter(o => o.trip_end == null);
                    filt[0].trip_end = now;
                }

                await this.transaction.commitP();
                // Added By Venkatesh on 28/04/25==>CODE START

                await this.tm.getTN('current_timeline').setData('3');


                //Added By Venkatesh on 28/04/25<==CODE END
                this.getActiveControlById('caller', 's_mheader_copy_new').setVisible(false);

                this.getActiveControlById('location', 's_mheader_copy_new').setVisible(false);
                this.getActiveControlById('inProcess', 's_mheader_copy_new').setVisible(true);
                this.getActiveControlById('EndTrip', 's_mheader_copy_new').setVisible(false);
                break;
            // case "ReachedAtSite": //Reached at Site
            //     await this.tm.getTN('detail').setProperty("status", "SR_00700") //
            //     await this.transaction.commitP();
            //     this.getActiveControlById('ReachedAtSite', 'pa_mtab').setVisible(false);
            //     this.getActiveControlById('inProcess', 'pa_mtab').setVisible(true);
            //     this.getActiveControlById('reschedule', 's_mdetail').setVisible(false);
            //     break;
            case "inProcess": //inprocess
                flag = 1; // to control edit button visibility
                await this.tm.getTN('detail').setProperty("status", "SR_00900") //
                let p = await this.fetchData('q_tech_startsla', { complaint_id: data.complaint_number, tech_id: data.technician })
                p[0].start_sla = now;
                await this.tm.getTN('ItemVisibility').setData("1")
                await this.transaction.commitP();
                // Added By Venkatesh on 28/04/25==>CODE START

                await this.tm.getTN('current_timeline').setData('4');


                //Added By Venkatesh on 28/04/25<==CODE END
                this.getActiveControlById('inProcess', 's_mheader_copy_new').setVisible(false);
                // this.getActiveControlById('reschedule', 's_mdetail').setVisible(false);
                this.getActiveControlById('reshchdeule', 's_mnappointment').setVisible(false);
                // this.getActiveControlById('serial_no', 's_mdetail').setVisible(true);
                this.getActiveControlById('warranti', 's_mnwarranty').setVisible(true);
                // this.getActiveControlById('additinalInfo', 's_mdetail').setVisible(true);
                // this.getActiveControlById('pending', 'pa_mtab').setVisible(true);
                // this.getActiveControlById('resolved', 'pa_mtab').setVisible(true);
                //to control item section visibilty
                break;
            case "pendingt": //pending
                flag = 0;
                await this.tm.getTN('detail').setProperty("status", "SR_00800");
                await this.tm.getTN('ItemVisibility').setData("0");
                this.getActiveControlById('inProcess', 's_mheader_copy_new').setVisible(false);
                this.getActiveControlById('EndTrip', 's_mheader_copy_new').setVisible(false);
                // this.getActiveControlById('resolved', 's_mheader_copy_new').setVisible(false);
                this.getActiveControlById('accept', 's_mheader_copy_new').setVisible(false);
                this.getActiveControlById('reject', 's_mheader_copy_new').setVisible(false);
                this.getActiveControlById('StartTrip', 's_mheader_copy_new').setVisible(true);
                // Added By Venkatesh on 28/04/25==>CODE START

                await this.tm.getTN('current_timeline').setData('4');


                //Added By Venkatesh on 28/04/25<==CODE END
                // this.getActiveControlById('serial_no', 's_mdetail').setVisible(false);
                this.getActiveControlById('warranti', 's_mnwarranty').setVisible(false);
                // this.getActiveControlById('additinalInfo', 's_mdetail').setVisible(false);

                await this.onmSavec();
                // await this.transaction.commitP();
                // this.getActiveControlById('pending', 'pa_mtab').setVisible(false)
                // this.getActiveControlById('resolved', 'pa_mtab').setVisible(true)
                break;
            case "resolvedt": //inprocess
                let date = new Date();
                await this.tm.getTN('detail').setProperty("resolved_date", now);
                await this.tm.getTN('detail').setProperty("status", "SR_01000")

                //resolved
                c = 1;
                await this.openDialog('pa_csat_dialog');

                // await this.onmSave()
                // await this.transaction.commitP();
                // this.getActiveControlById('edit', 'pa_mtab').setVisible(false)
                // this.getActiveControlById('resolved', 'pa_mtab').setVisible(false)
                break;


            default:
                break;
        }
        if (flag == 1) {
            this.getActiveControlById('edit_com', 's_mheader_copy_new').setVisible(true);
        }
        else {
            this.getActiveControlById('edit_com', 's_mheader_copy_new').setVisible(false);
        }

    }
    public async onmEditc() {

        let status = await this.tm.getTN('detail').getData().status;
        if (status == 'SR_00900') //inprocess
        {
            // this.getActiveControlById('pending', 's_mheader_copy_new').setVisible(true);
            // this.getActiveControlById('resolved', 's_mheader_copy_new').setVisible(true);
        }
        else if (status == "SR_00800") { //pending
            this.getActiveControlById('StartTrip', 's_mheader_copy_new').setVisible(true);

        }

        this.setMode("EDIT");
        this.getActiveControlById('edit_com', 's_mheader_copy_new').setVisible(false);
    }
    public async onmSavec() {
        //
        let now = new Date();
        let slaFlag = 0;
        let data = await this.tm.getTN('detail').getData();

        let status = await this.tm.getTN('detail').getData().status;
        switch (status) {
            case "SR_00800": //pending
                // this.getActiveControlById('resolved', 's_mheader_copy_new').setVisible(false);
                // this.getActiveControlById('pending', 's_mheader_copy_new').setVisible(false);
                this.getActiveControlById('StartTrip', 's_mheader_copy_new').setVisible(true);
                await this.sla(data, now)
                await this.transaction.commitP();
                // this.getActiveControlById('resolved', 's_mheader_copy_new').setVisible(false);

                // this.getActiveControlById('pending', 's_mheader_copy_new').setVisible(false);
                await this.tm.getTN('ItemVisibility').setData("1")
                this.setMode('DISPLAY');
                await this.RefreshData();
                (await this.getMessageBox()).information("Succesfully Saved")
                break;
            case "SR_01000":

                // await this.sla(data, now);
                // await this.changeSerialMaster() shifted code to rule

                let busyIndicator = new sap.m.BusyDialog();
                busyIndicator.setText('.....Saving');
                try {

                    busyIndicator.open()
                    await this.itemCheck(); // to check items stocks of a techincian at time of final complaint save
                    await this.tm.commitP("", "", false, true)
                    console.log('hi');
                    busyIndicator.close();
                    // await this.closeDialog('pa_csat_dialog');
                    // this.getActiveControlById('resolved', 's_mheader_copy_new').setVisible(false);

                    // this.getActiveControlById('pending', 's_mheader_copy_new').setVisible(false);
                    await this.tm.getTN('ItemVisibility').setData("1")
                    this.setMode('DISPLAY');
                    await this.RefreshData();
                    (await this.getMessageBox()).information("Succesfully Saved")
                }

                catch (error) {
                    busyIndicator.close();
                    await this.transaction.rollback();
                    await this.tm.getTN('detail').setProperty("csat"); //resolved  status
                    sap.m.MessageBox.error(error.message);
                    // await this.tm.getTN('detail').setProperty("status", "SR_00900");

                }

                break;
            case "SR_00900": //inprocess
                await this.transaction.commitP();
                this.getActiveControlById('edit_com', 's_mheader_copy_new').setVisible(true);
                // this.getActiveControlById('resolved', 's_mheader_copy_new').setVisible(false);

                // this.getActiveControlById('pending', 's_mheader_copy_new').setVisible(false);
                await this.tm.getTN('ItemVisibility').setData("1")
                this.setMode('DISPLAY');
                await this.RefreshData();
                (await this.getMessageBox()).information("Succesfully Saved")
                break;
            default:
                await this.transaction.commitP();
                await this.RefreshData();
                (await this.getMessageBox()).information("Succesfully Saved")
                break;
        }







    }
    public async onmCancelc() {
        await this.transaction.rollback();
        // this.getActiveControlById('pending', 's_mheader_copy_new').setVisible(false);
        // this.getActiveControlById('resolved', 's_mheader_copy_new').setVisible(false);
        this.setMode('DISPLAY')
        let status = this.tm.getTN('detail').getData().status;
        if (status == 'SR_00900') {
            this.getActiveControlById('edit_com', 's_mheader_copy_new').setVisible(true);
        }
    }
    public async onCancelCsat() {
        await this.closeDialog('pa_csat_dialog');
        await this.tm.getTN('detail').setProperty("status", "SR_00900");
    }
    public async onRescheduleSave() {
        await this.transaction.commitP();
        await this.closeDialog('pa_reschedule')
    }
    public async onRescheduleCancel() {
        await this.transaction.rollback();
        await this.closeDialog('pa_reschedule')
    }
    onSendCsat() {

    }
    public async onSaveCsat() {
        if (c == 1) {
            console.log('new button executed');
            let c_data = await this.tm.getTN('detail').getData();
            let csat = c_data?.csat
            let signature = c_data?.signature.attachment;
            if (csat !== null && csat !== undefined && signature !== null && signature !== undefined) {
                let csatLength = csat.toString().length; // double check
                if (csatLength > 0) {
                    await this.closeDialog('pa_csat_dialog');
                    await this.onmSavec();
                    // Added By Venkatesh on 28/04/25==>CODE START

                    await this.tm.getTN('current_timeline').setData('5');

                    this.getActiveControlById('edit_com', 's_mheader_copy_new').setVisible(false);
                    //Added By Venkatesh on 28/04/25<==CODE END
                }
                else {
                    try {
                        throw new Error('Please fill csat and signature')
                    } catch (error) {
                        sap.m.MessageBox.error(error.message);
                    }

                }

            }
            else {
                try {
                    throw new Error('Please fill csat and signature')
                } catch (error) {
                    sap.m.MessageBox.error(error.message);
                }
            }


        }
        else if (c == 0) {
            await this.onmSave();
        }



    }


    /* public async onItemsDelete(oEvent) {
         let path = this.getPathFromEvent(oEvent);
         let ln = Number(path.split('/').pop());
         await this.tm.getTN('item').getData()[ln].deleteP();
     } */


    public async onItemsDelete(oEvent) {
        let path = this.getPathFromEvent(oEvent);
        let ln = Number(path.split('/').pop());
        let deleted_item = await this.tm.getTN('item').getData()[ln];
        await this.tm.getTN('item').getData()[ln].deleteP();
        let product_id = deleted_item.spare_part;
        let curr_stock = await this.tm.getTN('list_tech_stock').getData();
        for (let data of curr_stock) {
            if (data.product_id == product_id) {
                data.qty = data.qty + deleted_item.qty;
            }
        }
        // for refactoring item numbers after delete
        let item = await this.tm.getTN('item').getData();
        for (let i = 0; i < item.length; i++) {
            item[i].item_number = ((i + 1) * 10);
        }
    }


    public async onItemsDeleteDlr() {
        let selected_indices = [];
        selected_indices = this.getSubscreenControl('s_item').getSelectedIndices();
        for (let ln of selected_indices) {
            let deleted_item = await this.tm.getTN('item').getData()[ln];
            await this.tm.getTN('item').getData()[ln].deleteP();
            let product_id = deleted_item.spare_part;
            let curr_stock = await this.tm.getTN('list_tech_stock').getData();
            for (let data of curr_stock) {
                if (data.product_id == product_id) {
                    data.qty = data.qty + deleted_item.qty;
                }
            }
        }
        // for refactoring item numbers after delete
        let item = await this.tm.getTN('item').getData();
        for (let i = 0; i < item.length; i++) {
            item[i].item_number = ((i + 1) * 10);
        }
    }





    async OnsetDates() { //onenter
        let today = new Date();
        const hours = today.getHours();
        let slots = [
            { key: "AS_001", range: "9:00 AM - 12:00 PM" },
            { key: "AS_002", range: "12:00 PM - 3:00 PM" },
            { key: "AS_003", range: "3:00 PM - 6:00 PM" },
            { key: "AS_004", range: "6:00 PM - 9:00 PM" },
        ];
        if (9 <= hours && hours < 11) {
            slots = [

                { key: "AS_002", range: "12:00 PM - 3:00 PM" },
                { key: "AS_003", range: "3:00 PM - 6:00 PM" },
                { key: "AS_004", range: "6:00 PM - 9:00 PM" },
            ];
        }
        else if (11 <= hours && hours < 14) {
            slots = [

                { key: "AS_003", range: "3:00 PM - 6:00 PM" },
                { key: "AS_004", range: "6:00 PM - 9:00 PM" },
            ];
        }
        else if (14 <= hours && hours < 17) {
            slots = [


                { key: "AS_004", range: "6:00 PM - 9:00 PM" },
            ];
        }

        await this.tm.getTN('slots').setData(slots);
        await this.tm.getTN('detail').setProperty("appointment_date", today);
    }



    async onDateChange(oEvent) {
        let input = new Date(oEvent.oSource.mProperties.dateValue);
        let today = new Date();
        input.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        let slots = [
            { key: "AS_001", range: "9:00 AM - 12:00 PM" },
            { key: "AS_002", range: "12:00 PM - 3:00 PM" },
            { key: "AS_003", range: "3:00 PM - 6:00 PM" },
            { key: "AS_004", range: "6:00 PM - 9:00 PM" },
        ];
        if (input.getTime() === today.getTime()) {
            const hours = new Date().getHours();

            if (9 <= hours && hours < 11) {
                slots = [

                    { key: "AS_002", range: "12:00 PM - 3:00 PM" },
                    { key: "AS_003", range: "3:00 PM - 6:00 PM" },
                    { key: "AS_004", range: "6:00 PM - 9:00 PM" },
                ];
            }
            else if (11 <= hours && hours < 14) {
                slots = [

                    { key: "AS_003", range: "3:00 PM - 6:00 PM" },
                    { key: "AS_004", range: "6:00 PM - 9:00 PM" },
                ];
            }
            else if (14 <= hours && hours < 17) {
                slots = [


                    { key: "AS_004", range: "6:00 PM - 9:00 PM" },
                ];
            }
            else if (17 <= hours && hours < 21) {
                slots = [

                    // { key: "AS_003", range: "3:00 PM - 6:00 PM" },
                    // { key: "AS_004", range: "6:00 PM - 9:00 PM" },
                ];
            }

            else if (6 <= hours && hours <= 9) {
                slots = [
                    { key: "AS_001", range: "9:00 AM - 12:00 PM" },
                    { key: "AS_002", range: "12:00 PM - 3:00 PM" },
                    { key: "AS_003", range: "3:00 PM - 6:00 PM" },
                    { key: "AS_004", range: "6:00 PM - 9:00 PM" },
                ];
            }
            await this.tm.getTN('slots').setData(slots)


        }
        else if (input.getTime() > today.getTime()) {
            slots = [
                { key: "AS_001", range: "9:00 AM - 12:00 PM" },
                { key: "AS_002", range: "12:00 PM - 3:00 PM" },
                { key: "AS_003", range: "3:00 PM - 6:00 PM" },
                { key: "AS_004", range: "6:00 PM - 9:00 PM" },
            ];
            await this.tm.getTN('slots').setData(slots)
        }
        else {
            try {
                throw new Error("Please select a date that is today or in the future.")
            }
            catch (error) {
                sap.m.MessageBox.error(error.message);
            }
        }

    }
    public async onCheckItemSerial(oEvent) { // to set spare part and serial no
        let x = this.getActiveControlById('kbarcode', 's_item_detail')
        let serial_no = x.mProperties.value;
        let detail = await this.tm.getTN('detail').getData()
        let tech = detail.technician;


        let data = await this.fetchData('d_serial_master', { serial_number: serial_no, employee_id: tech });
        if (data.length > 0) {
            await this.tm.getTN('item_detail').setProperty('serial_number', data[0].serial_number);
            await this.tm.getTN('item_detail').setProperty('spare_part', data[0].product_id);
            await this.onSpareChange();
        }
        else {
            sap.m.MessageToast.show('Serial No Not Found');
            await this.tm.getTN('item_detail').setProperty('spare_part');
            await this.tm.getTN('item_detail').setProperty('serial_number');
        }
    }


    public async findDealers(oem, relationMap) {
        let dealers = [];

        // Recursive function to find dealers from a given starting point
        function findSubBranches(parent) {
            // Find all sub-levels under the current parent (branches, sub-branches, etc.)
            const children = relationMap.filter(entry => entry.user_main === parent);

            // For each child, if it's a dealer and an employee, add to the dealers list; otherwise, recurse
            for (let child of children) {
                // Check if the current level is a dealer by looking at the relation_type
                if (child.relation_type === 'Dealer') {        // need to change this relation_type later when relation type is maintained properly
                    // It's a dealer (employee), add to list
                    dealers.push(child.user_sub);
                } else {
                    // It's not a dealer, recurse further down the hierarchy
                    findSubBranches(child.user_sub);
                }
            }
        }

        // Start recursion from the given OEM
        findSubBranches(oem);

        return dealers;
    }

    public async onMReject() {
        await this.tm.getTN('detail').setProperty("status", "SR_00600") //rejected by tech
        await this.tm.getTN('detail').setProperty("technician", "") //remove the techninician from complaint
        await this.transaction.commitP();
        this.getActiveControlById('accept', 'pa_mtab').setVisible(false);
        this.getActiveControlById('reject', 'pa_mtab').setVisible(false);

        this.getActiveControlById('accept', 's_mheader_copy_new').setVisible(false);
        this.getActiveControlById('reject', 's_mheader_copy_new').setVisible(false);
        this.getActiveControlById('caller', 's_mheader_copy_new').setVisible(false);

        this.getActiveControlById('location', 's_mheader_copy_new').setVisible(false);
        await this.closeDialog('pa_m_remark_dialog');
    }


    public async onAddSerialAttach(oEvent) {
        // let ref_id = await this.tm.getTN('detail').getActiveData().guid;
        // let attach_name = "prod-ser-" + ref_id.serial_number;
        // await this.tm.getTN('prodAttach').createEntityP({ ref_guid: ref_id, attachment_name: attach_name }, 'successful', 'Failed', 'pa_attach_dialog', 'First', false, true);
        sap.m.MessageToast.show('InProgress')
    }
    public async onnavToUpdateSerialDialog() { // to update serial no
        mobileNewEquipFlag = 1;
        let ref_id = await this.tm.getTN('detail').getActiveData().guid;
        await this.tm.getTN('prodAttach').createEntityP({ ref_guid: ref_id }, '', 'Failed', 'pa_serial', 'First', false, true);
        // this.openDialog('pa_serial')
        // this.navTo({S:"p_complaints",SS:"pa_serial"});
    }

    public async onUpdate() {  // update  button on update serial no dialog
        // let ref_id = await this.tm.getTN('detail').getActiveData()
        if (mupdateflag == 1) {
            mupdateflag = 0;
            serialFlag = 1;  // a flag while updating serial no  in mobile view

        }
        else {
            await this.mafterChange();
        }
        console.log('returned succesfully from filProductDetail')
        let ref_id = await this.tm.getTN('detail').getActiveData();
        console.log(ref_id);
        let attach_name = "PR-SN-" + ref_id.serial_number;
        await this.tm.getTN('prodAttachDetail').setProperty("attachment_name", attach_name);
        console.log("setting attch name was succes");
        if (serialFlag == 1) { // to check whether waranty data has been updated or not
            console.log("entered close dialog block");
            this.closeDialog('pa_serial');
            serialFlag = 0;
        }

    }
    public async onserialCancel() {
        mobileNewEquipFlag = 0;
        serialFlag = 0;
        await this.transaction.rollback();
        this.closeDialog('pa_serial');
    }
    public async mnewEquipment() { //for new equipment
        mupdateflag = 1
        let cust_id = await this.tm.getTN('detail').getData().customer_id;
        let gu = await this.fetchData('d_customer', { customer_id: cust_id });
        let guid = gu[0].guid;
        let addr = await this.fetchData("d_address", { guid: guid, isprimary: true });
        // let prod_id =await this.tm.getTN('detail').getData().product_id;
        let serial_no = await this.tm.getTN('detail').getData().serial_number;
        let product = await this.tm.getTN('detail').getData().product_id;
        // customer_id:cust_id,serial_no:serial_no,product_id:prod_id
        let address
        if (addr.length > 0) {
            address = addr[0].address_no
        }
        // a = 1; // for on save 
        // await this.tm.getTN('equipment').setData(1); // to control visiblility between product section and equipment section
        let d = await this.tm.getTN('list_equipment').createEntityP({ customer_id: cust_id, serial_no: serial_no, product_id: product, address: address }, '', 'Failed creating new equipment', 'pa_mNewEquip', 'First', false, true)
        // let e = this.getActiveControlById('continue', 's_addEquipment');
        // e.setVisible(true);
        // let f = this.getActiveControlById('newequipment', 's_product');
        // f.setVisible(false);
    }
    public async onMCancel() {
        mupdateflag = 0;
        await this.transaction.rollback();
        this.closeDialog('pa_mNewEquip');
    }
    public async onMContinue() {
        let productId = await this.tm.getTN('detail_Equipment').getData().product_id;
        let dop = await this.tm.getTN('detail_Equipment').getData().date_of_purchase;
        await this.tm.getTN('detail').setProperty('product_id', productId)
        await this.fillproductdetail(productId, dop);
        let equip = await this.tm.getTN('detail_Equipment').getData()
        await this.transaction.createEntityP('d_equipment_customer', { serial_no: equip.serial_no, guid: equip.customer_id, customer_id: equip.customer_id });

        this.closeDialog('pa_mNewEquip');
    }
    public async mafterChange() {
        // to check if serial no exists in equipment if no add button wil be there 
        // if Sno already exists then it checks the product id,then dop and warranty fields will auto fill
        let sno = await this.tm.getTN('detail').getData().serial_number;
        let existing_product_id = await this.tm.getTN('detail').getData().product_id;
        let productData = await this.fetchData('q_equipment_master', { serial_no: sno });


        if (productData.length > 0) {
            let productId = productData[0].product_id;
            if (existing_product_id == productId) {
                let dop = productData[0].date_of_purchase;
                await this.fillproductdetail(existing_product_id, dop);
            }
            else {
                const userConfirmed = await new Promise((resolve) => {
                    this.getMessageBox().then((messageBox) => {
                        messageBox.confirm(
                            `Do you want to change the product? For S.No:${sno}, the product is ${productId}`,
                            {
                                actions: [messageBox.Action.OK, messageBox.Action.CANCEL],
                                onClose: (oAction) => resolve(oAction === messageBox.Action.OK),
                            }
                        );
                    });
                });
                if (userConfirmed) {
                    let dop = productData[0].date_of_purchase;
                    await this.tm.getTN('detail').setProperty('product_id', productId);
                    await this.fillproductdetail(productId, dop);
                }
            }

        }
        else {
            sap.m.MessageToast.show('Serial Number Not Found');
            if (mobileNewEquipFlag == 1) {
                let d = this.getActiveControlById('add_attach', 's_serial');
                d.setVisible(true);
                mobileNewEquipFlag = 0;
            }
            // else{
            //     let d = this.getActiveControlById('newequipment', 's_product');
            // d.setVisible(true);
            // }

        }



    }

    public onsubmit(oEvent) {
        console.log(oEvent)
        console.log("submit")
    }
    public async onscan(oEvent) {
        //this function triggers when the user scan the line items serial no bar code 
        console.log(oEvent);
        console.log("scan")
        let serial_no = oEvent.mParameters.value;


        if (serial_no.length > 0) await this.onnewitem_usingscanner(serial_no);
    }
    public async onchange(oEvent) {
        //this function triggers when the user enter the line items serial no bar code 
        console.log(oEvent)
        console.log("change")
        let serial_no = oEvent.mParameters.value
        if (serial_no.length > 0) await this.onnewitem_usingscanner(serial_no); //  this function will handle the further flow

    }

    public async onCall() {
        let mno = await this.tm.getTN('detail').getData().tocustomer[0]?.toaddress[0]?.fetch();
        let mobile_no = mno[0].mobile_no;
        console.log(`mobile no : ${mobile_no}`);
        if (sap.ui.Device.system.phone) {
            sap.m.URLHelper.triggerTel(mobile_no);
        }
    }

    public async fillproductdetail(product, dop) {
        let detail = await this.tm.getTN('detail').getData();
        // to fill warranty details in the product tab
        let compl_Date = detail.s_created_on;
        const currentDate = new Date();
        await this.tm.getTN('detail').setProperty('date_of_purchase', dop);
        let product_guid = await this.tm.getTN('detail').getData()?.toproduct?.fetch();
        let guid = product_guid[0].product_guid;
        let warranty_data = await this.fetchData('q_warranty_master', { product_guid: guid });
        const warrantyPeriods = warranty_data.map(o => ({
            start: new Date(o.validity_start), // Convert to Date object
            end: new Date(o.validity_end), // Convert to Date object
            warr_id: o.warr_id
        }));


        const findWarranty = (date: Date, periods: { start: Date; end: Date; warr_id: string }[]) => {
            return periods.find(period => date >= period.start && date <= period.end);
        };
        const result = findWarranty(new Date(dop), warrantyPeriods);
        console.log(result)

        if (result) {

            let warr_id = result.warr_id;
            let warranty_duration = await this.transaction.getExecutedQuery('d_warranty_duration', { loadAll: true, warr_id: warr_id });
            let duration = warranty_duration[0].warr_duration;

            const dops = new Date(dop);
            const complaintDate = new Date(compl_Date);
            const warrantyEndDate = new Date(dop);
            warrantyEndDate.setMonth(warrantyEndDate.getMonth() + duration);
            warrantyEndDate.setDate(warrantyEndDate.getDate() - 1);
            if (complaintDate >= dop && complaintDate <= warrantyEndDate) {
                await this.tm.getTN('detail').setProperty("warranty_type", 'SW')
            }
            else {
                await this.tm.getTN('detail').setProperty("warranty_type", 'OW')
            }
            await this.tm.getTN('detail').setProperty("warranty_period", warr_id)


        }
        else {
            sap.m.MessageToast.show('No warrant available');
        }



        // if (warranty_data.length == 0) {
        //     console.log('No warranty Data Found For Following Product');
        //     await this.tm.getTN('detail').setProperty('warranty_type');
        //     await this.tm.getTN('detail').setProperty('warranty_period');
        // }
        // else {
        //     const validRows = warranty_data.filter(row => {
        //         return currentDate >= row.validity_start && currentDate <= row.validity_end;
        //     });

        //     if (validRows.length == 1) {
        //         await this.tm.getTN('detail').setProperty('warranty_type', validRows[0].warr_type);
        //         await this.tm.getTN('detail').setProperty('warranty_period', validRows[0].warr_id);

        //     }
        //     else if (validRows.length > 1) {
        //         sap.m.MessageToast.show('More than one warranty found for current date');
        //         await this.tm.getTN('detail').setProperty('warranty_type');
        //         await this.tm.getTN('detail').setProperty('warranty_period');
        //     }
        //     else if (validRows.length == 0) {
        //         sap.m.MessageToast.show('Currently No warranty found for the following product');
        //         await this.tm.getTN('detail').setProperty('warranty_type');
        //         await this.tm.getTN('detail').setProperty('warranty_period');
        //     }
        // }
        serialFlag = 1;
    }
    public async onDopChange() {
        let detail = await this.tm.getTN('detail').getData();
        let dop = detail.date_of_purchase;
        let product = detail.product_id;
        let compl_Date = detail.s_created_on;
        if (new Date(dop) > new Date(compl_Date)) {
            sap.m.MessageToast.show('DOP is greater than Complaint Date')
            await this.tm.getTN('detail').setProperty('date_of_purchase');
        }
        else {
            let pdata = await this.tm.getTN('detail').getData()?.toproduct?.fetch();
            let product_guid = pdata[0].product_guid;
            let warranty_data = await this.transaction.getExecutedQuery('d_warranty_master', { loadAll: true, product_guid });
            const warrantyPeriods = warranty_data.map(o => ({
                start: new Date(o.validity_start), // Convert to Date object
                end: new Date(o.validity_end), // Convert to Date object
                warr_id: o.warr_id
            }));


            const findWarranty = (date: Date, periods: { start: Date; end: Date; warr_id: string }[]) => {
                return periods.find(period => date >= period.start && date <= period.end);
            };
            const result = findWarranty(new Date(dop), warrantyPeriods);
            console.log(result)
            if (result) {

                let warr_id = result.warr_id;
                let warranty_duration = await this.transaction.getExecutedQuery('d_warranty_duration', { loadAll: true, warr_id: warr_id });
                let duration = warranty_duration[0].warr_duration;

                const dops = new Date(dop);
                const complaintDate = new Date(compl_Date);
                const warrantyEndDate = new Date(dop);
                warrantyEndDate.setMonth(warrantyEndDate.getMonth() + duration);
                warrantyEndDate.setDate(warrantyEndDate.getDate() - 1);
                if (complaintDate >= dop && complaintDate <= warrantyEndDate) {
                    await this.tm.getTN('detail').setProperty("warranty_type", 'SW')
                }
                else {
                    await this.tm.getTN('detail').setProperty("warranty_type", 'OW')
                }
                await this.tm.getTN('detail').setProperty("warranty_period", warr_id)


            }
            else {
                sap.m.MessageToast.show('No warrant available');
            }
        }

    }

    public async customerNameFormatter(customer_id, name, oEvent) {
        // customerNameFormatter
        // [{"path" : "$M>customer_id"},{"path" : "$M>tocustomer/0/first_name"}]
        if (customer_id) {
            if (name) {
                return customer_id + " " + name;
            } else {

                return customer_id;

            }
        } else {
            return null;
        }

    }
    public async onMdetailExpand(oEvent) {

        let path = oEvent.mParameters.id;
        let ln = path.split('_').pop();
        // MDetailExpand
        switch (ln) {
            case 'addC':
                await this.tm.getTN('MDetailExpand').setData('CUS');
                break;
            case 'addw':
                await this.tm.getTN('MDetailExpandW').setData('WAR');
                break;
            case 'addA':
                await this.tm.getTN('MDetailExpandA').setData('APT');
                break;
            case 'minimize':
                await this.tm.getTN('MDetailExpand').setData();
                break;
            case 'minimiW':
                await this.tm.getTN('MDetailExpandW').setData();
                break;
            case 'minimeseA':
                await this.tm.getTN('MDetailExpandA').setData();
                break;
            default:
                // await this.tm.getTN('MDetailExpand').setData();
                break;
        }
    }


    public async onFuzzy() {
        let searchVal = this.getControlsByID('fuzzy', 's_fuzzy')[0].mProperties.value;
        let detail = await this.tm.getTN('detail').getData();
        let role = await this.tm.getTN('role').getData();

        if (role == 'TECHNICIAN') {
            let q = await this.transaction.getQueryP('q_tech_stock_info');
            q.setLoadAll(true);
            let data = await q.executeP();
            let filter_data = data.filter(e =>
                e.product_id.toLowerCase().includes(searchVal.toLowerCase()) ||
                e.product_desc.toLowerCase().includes(searchVal.toLowerCase())
            );
            await this.tm.getTN('list_tech_stock').setData(filter_data);
        }
        else if (role == 'DEALER') {
            let q = await this.transaction.getQueryP('q_tech_stock_info_dlr');
            q.setLoadAll(true);
            q.employee_id = detail.technician;
            let data = await q.executeP();
            let filter_data = data.filter(e =>
                e.product_id.toLowerCase().includes(searchVal.toLowerCase()) ||
                e.product_desc.toLowerCase().includes(searchVal.toLowerCase())
            );
            await this.tm.getTN('list_tech_stock').setData(filter_data);
        }

    }

    public async onItemContinue() {
        await this.closeDialog('pa_mtechstock');

        let curr_stock = await this.tm.getTN('list_tech_stock').getData();
        let data = await this.tm.getTN('detail').getData()
        let guid = await this.tm.getTN('detail').getData().guid;
        outerLoop: for (let dat of curr_stock) {
            if (dat.cal_qty > 0) {
                dat.qty = dat.qty - dat.cal_qty;
                /*for(let i = 0; i<dat.cal_qty; i++){
                    let item_data = this.tm.getTN('item').getData();
                    let itemid: Number = (item_data.length + 1) * 10;
                    await this.tm.getTN('item').createEntityP({ guid: guid, item_number: itemid, item_id: 'CREATE', complaint_number: data.complaint_number, spare_part:  dat.product_id, spare_part_desc:dat.product_desc }, 'successful', 'Failed', '', 'First', false, true)
                }*/
                let item_data = this.tm.getTN('item').getData();
                for (let data of item_data) {
                    if (data.spare_part == dat.product_id) {
                        data.qty = data.qty + dat.cal_qty;
                        continue outerLoop;
                    }
                }
                let itemid: Number = (item_data.length + 1) * 10;
                await this.tm.getTN('item').createEntityP({ guid: guid, item_number: itemid, item_id: 'CREATE', complaint_number: data.complaint_number, spare_part: dat.product_id, spare_part_desc: dat.product_desc, qty: dat.cal_qty }, 'successful', 'Failed', '', 'First', false, true)
                dat.cal_qty = 0;
                // await this.tm.getTN('item').createEntityP({ guid: guid, item_number: itemid, item_id: 'CREATE', complaint_number: data.complaint_number, spare_part:  dat.product_id, spare_part_desc:dat.product_desc }, 'successful', 'Failed', '', 'First', false, true)
            }
        }



    }

    public async onStockSearch() {
        let search_visibility = this.tm.getTN('stock_search_visibility').getData();
        if (search_visibility == false) {
            this.tm.getTN('stock_search_visibility').setData(true);
        }
        else {
            this.tm.getTN('stock_search_visibility').setData(false);
        }
    }

    public async onAttachDelete(oEvent) {
        let path = this.getPathFromEvent(oEvent);
        let ln = Number(path.split('/').pop());
        await this.tm.getTN('attachment').getData()[ln].deleteP();
    }

    public async onCategoryEnter() {

        await this.newVhRequest2();
        // on selecting the feedback ;; to set data to further level's vh
        let key = await this.tm.getTN('item_detail').getData().feedback; // the selected key on vh
        if (key) {
            let leastLevel = 2;
            let maxLevel = await this.tm.getTN('visible').getData();
            let datapath = 'data' + levelValue;
            let data = await this.tm.getTN(datapath).getData();
            let filterData = data.filter(o => o.catid == key);
            catname[levelValue - 1] = filterData[0].catname; //we are setting description manully every time to "catname" other type tn
            await this.tm.getTN('hierarchy').setProperty('level4', key);   // setting the feedback value to the max level feedback

            if (levelValue >= 2) {
                let datax = categoryData;
                let currentRef = filterData[0].ref;
                // if level > 2 is selected then auto fills the previous levels (..higher than the current level)data
                for (let i = levelValue - 2; i > 0; i--) {
                    let parentNode = datax.find(o => o.guid === currentRef);
                    if (parentNode) {
                        // Set the catname for the current level
                        catname[i] = parentNode.catdesc;
                        let lev = "level" + (i + 1);

                        await this.tm.getTN('hierarchy').setProperty(lev, parentNode.catid);
                        // Update currentRef to the parent's ref
                        currentRef = parentNode.ref;
                    } else {
                        // Break the loop if no parent is found
                        break;
                    }
                }

                // and should clear below levels 
                let upper = levelValue + 1
                for (upper; upper <= maxLevel; upper++) {
                    delete catname[upper - 1];
                    let p = "data" + upper;
                    await this.tm.getTN(p).setData(); // to clear higher level vhs
                    let a = await this.tm.getTN('hierarchy').getData()
                    delete a[`level${upper}`];

                    // if required > if any potential issues are caused need to clear hierarchial data in further
                }

            }

        }
        else {
            await this.FeedbackClear();
        }
    }



    public async newVhRequest2() { // triggers when the user clicks vh icon (this function will trigger on vh press used in item flow) 
        //let path = oEvent.mParameters.id;
        //let num = Number(path.slice(-1));
        let maxLevel = await this.tm.getTN('visible').getData();
        levelValue = 4; // setting the path of event for further use
        if (2 < levelValue) { // for level value greater than 2 this logic applies; y bcoz always the level will be based on level 1 which is not editable at all
            let data = categoryData;
            let previouslevel = levelValue - 1;
            let datapath = "data" + levelValue
            let lev = "level" + previouslevel
            let a = this.getActiveControlById(lev, "s_item_category")
            let b = a.mProperties.selectedKey
            //we can collapse this logic if the customer wants all the data all the time in vhs
            if (b.length > 0) { // if previous level is filled means then the present level vh data will be based on the previous level
                let filter = data.filter(o => o.catid == b);
                let guid = filter[0].guid;
                let dx = data.filter(o => o.ref == guid);

                let tech_data = dx.map((tech) => ({ guid: tech.guid, catid: tech.catid, catname: tech.catdesc, ref: tech.ref }));
                await this.tm.getTN(datapath).setData(tech_data);

            }
            else {
                // else all the data of particular level will be available in vh 
                const levelDat = globalLevelData[`level${levelValue}`];
                console.log(levelDat);
                let tech_data = levelDat.map((tech) => ({ guid: tech.guid, catid: tech.catid, catname: tech.catdesc, ref: tech.ref }));
                await this.tm.getTN(datapath).setData(tech_data);
            }
        }
    }


    public async FeedbackClear() {
        // await this.transaction.rollback();
        let search: Array<{ "level1": string, "level2": string, "level3": string, "level4": string, "level5": string, "level6": string, "level7": string, "level8": string, "level9": string, "level10": string }> = [];
        catname = [];
        await this.tm.getTN('catname').setData(catname);
        await this.tm.getTN('hierarchy').setData(search);
        await this.partOfFeedbackPress();

    }






    public async onDialogOpen() {  // to set the original item qty & max limit
        let item = await this.tm.getTN('item_detail').getData();
        global_item_qty = item.qty;
        let role = await this.tm.getTN('role').getData();

        if (role == 'TECHNICIAN') {

            let q = await this.transaction.getQueryP('q_tech_stock_info');
            q.setLoadAll(true);
            let list = await q.executeP();
            await this.tm.getTN('list_tech_stock').setData(list);

        }
        else if (role == 'DEALER') {
            let data = await this.tm.getTN('detail').getData();
            let q = await this.transaction.getQueryP('q_tech_stock_info_dlr');  // need to change query name here
            q.setLoadAll(true);
            //q.fg_product = data.product_id;
            q.employee_id = data.technician;
            let list = await q.executeP();
            await this.tm.getTN('list_tech_stock').setData(list);
        }


        let tech_stock = await this.tm.getTN('list_tech_stock').getData();

        let filtered_stock = tech_stock.filter(stock => stock.product_id === item.spare_part);
        let max_qty = filtered_stock[0].qty + global_item_qty;
        await this.tm.getTN('max_stepper').setData(max_qty);
    }



    public async onDialogClose() {

        // to check if current item has undergone any change & update accordingly

        let curr_item = await this.tm.getTN('item_detail').getData();
        let heirarchyData = await this.tm.getTN('hierarchy').getData();
        if (global_item_qty != curr_item.qty || heirarchyData.level4 != curr_item.feedback || !heirarchyData) {
            await this.onUpdateFeedBack();
        }
    }

    public async formattimelineprogress(param, oEvent) {
        switch (param) {
            case '1':
                return '0%';
                break;
            case '2':
                return '25%';
                break;
            case '3':
                return '50%';
                break;
            case '4':
                return '75%';
                break;
            case '5':
                return '100%';
                break;
            default:
                return '0%';
                break;
        }
    }

    public async formattimelinecolor(param, curr_timeline) {
        let r;

        // let curr_timeline = await this.tm.getTN('current_timeline').getData();
        if (curr_timeline != null && curr_timeline != '') {
            if (param == curr_timeline) {
                r = '#2c7604'; //Green
            } else if (param < curr_timeline) {
                r = '#1279f8'; //Blue
            } else if (param > curr_timeline) {
                r = '#f81212'; //Red
            }
        }
        return r;
    }


    public async DialCustomer(oEvent) {
        let path = this.getPathFromEvent(oEvent);
        let ln = Number(path.split('/').pop());
        let mobile = await this.tm.getTN('customer_mobile').getData()[ln]?.mobile;

        if (sap.ui.Device.system.phone) {
            sap.m.URLHelper.triggerTel(mobile);
        }
    }


    public async DialCustomerSecondary() {
        let mobile = await this.tm.getTN('customer_mobile').getData()?.alternate_mobile;

        if (sap.ui.Device.system.phone) {
            sap.m.URLHelper.triggerTel(mobile);
        }
    }


}
