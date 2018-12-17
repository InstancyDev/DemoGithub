import { Component, OnInit, Input } from '@angular/core';
import { RemotingClientService } from '../services/remoting-client.service';
import { CookieService } from 'ngx-cookie-service';
import { UserLogin } from '../DTO/user-login';
import { HttpParams } from '@angular/common/http';
import { Usercontext } from '../DTO/usercontext';
import { GroupStatus } from '../enums/group-stauts.enum';
import { UserStatus } from '../enums/user-status.enum';
import { CatalogPrivileges } from '../enums/catalog-privileges.enum';
import { ContentAccessRule } from '../enums/content-access-rule.enum';
import { CommonUtilitesService } from '../services/common-utilites.service';
import { SharedService } from '../services/shared.service';
import { UserPrivileges } from '../enums/user-privilege.enum';
import { ObjectTypes } from '../enums/object-types.enum';
import { MyCatalogPrivileges } from '../enums/my-catalog-privileges.enum';



import { Router, RouterModule, Routes, ActivatedRoute } from '@angular/router';
// import { LeftnavigationComponent } from '../Menus/leftnavigation/leftnavigation.component';
import { DynamicServicesService } from '../Menus/services/dynamic-services.service';
import { LeftnavigationComponent } from '../MENUS/leftnavigation/leftnavigation.component';
import { CommonProxyService } from '../services/common-proxy.service';
import * as _ from 'lodash';

declare var jQuery: any;
declare var $: any;
declare var getUtilites: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent implements OnInit {

  // @Input() Leftnavigation: LeftnavigationComponent;
  @Input() ParametersObj: any;



  public basicAuthToken;
  public strJson;
  public usercontext: Usercontext;
  public username: string;
  public password: string;
  public model: any = {};
  public userLogin: UserLogin;
  public LoginFaild: any;
  public leftnavigation: any;
  public errorAlert :boolean=false;
  public ispopup = false
  UrlParams: any = [];
  public RedirectedUrl = '';

  constructor(private rmc: RemotingClientService,
    private Commonutilites: CommonUtilitesService,
    private commonProxyService: CommonProxyService,
    private router: Router,
    private shared: SharedService,
    private activatedRoute: ActivatedRoute,
  ) {

    if (this.ParametersObj != undefined && this.ParametersObj.isPopup == true) {
      this.UrlParams = this.ParametersObj;
    }
    else {
      this.activatedRoute.params.subscribe(params => {
        this.UrlParams = params;
      });
    }
  }

  async ngOnInit() {


    if (this.ParametersObj != undefined) {
      if (this.ParametersObj.isPopup != undefined && this.ParametersObj.isPopup == true) {
        this.ispopup = true
        this.UrlParams = this.ParametersObj;
      }

      // if( this.commonProxyService.getCookie('Password') != null && this.commonProxyService.getCookie('username') != null){
      //   this.model.username = this.commonProxyService.getCookie('Password')
      //   this.model.password = this.commonProxyService.getCookie('username')
      // }
      
      // if (this.ParametersObj.RedirectURL != undefined) {
      //   this.RedirectedUrl = this.ParametersObj.RedirectURL
      // }
    }
  }

  checkedbox = false

  checkedtrue(){
    this.checkedbox = ! this.checkedbox
  }

  public async Login() {
    this.LoginFaild = '';
    let DataObj = {
      LoginID : this.model.username,
      Password : this.model.password,
      SessionID : '',
      ApplicationURL : this.Commonutilites.LMSURL(),
      IsEncrypted: false
    }

    // if(this.checkedbox == true){
    //   this.commonProxyService.setCookie('username', this.model.username)
    //   this.commonProxyService.setCookie('Password', this.model.password)
    // }


    this.rmc.Login($.param(DataObj)).subscribe(
      data =>{
        if (data==null || data==undefined || data["UserID"]==undefined){
          this.errorAlert=true;
          setTimeout(() => {
            this.errorAlert = false;
        }, 3000);
        }
      this.strJson = data
      } ,
      (err) =>{
        this.errorAlert=true;
        setTimeout(() => {
          this.errorAlert = false;
      }, 3000);
        console.error(err)
      } ,
      async () => {
        let objUserStatus: UserStatus;
        let Locked: number;
        let RemainingDateToChangePassword: number = 1;
        let InvalidLoginAttempt: number;
        let LockedBy: String = '';
        let intLockedTime: number = 0;
        let groupStatus: GroupStatus;
        this.commonProxyService.setCookie('userContext_' + this.Commonutilites.LearnerURL(), 'true');
        this.commonProxyService.setSessionStorage('userContext_' + this.Commonutilites.LearnerURL(), JSON.stringify(this.strJson));

        let chkValidateLogin: boolean;
        await this.ValidateLogin(objUserStatus, Locked, RemainingDateToChangePassword, InvalidLoginAttempt,
          LockedBy, intLockedTime, groupStatus).then(
            (data) => { chkValidateLogin = data; });
        if (chkValidateLogin) {
          this.shared.fnObsSuccessLogin();
          this.commonProxyService.setCookie('login', 'successlogin')
          this.rmc.getLeftNavigation().subscribe(
            (data) => {
              this.leftnavigation = data;
              if (this.leftnavigation.length == 1) {
                if (this.leftnavigation[0].text == "redirecttofirstmenu")
                  this.rmc.getLeftNavigation(this.leftnavigation[0].contextmenutitle).subscribe(
                    (data) => {
                      this.leftnavigation = data;
                      this.shared.fnObsMenusNavigation(this.leftnavigation);
                      this.leftnavigation = _.filter(this.leftnavigation, function (obj) {
                        return obj.visible == true;
                      });
                      //this.navigateTo();
                      this.login1()
                    })
              }
              else {
                this.shared.fnObsMenusNavigation(this.leftnavigation);
                this.leftnavigation = _.filter(this.leftnavigation, function (obj) {
                  return obj.visible == true;
                });
                //this.navigateTo();
                this.login1()
              }
            });

        } else {
          this.LoginFaild = 'Invalid Email or Password!';
        }
      }
    )
  }


  login1() {
    if (this.UrlParams["israting"] == "true") {
      let RedirectURL = this.Commonutilites.ApplicationURL() + "/" + this.Commonutilites.GetContextMenuName(this.Commonutilites.GetConfigKeyValue("detailsMenuid")) + "/Contentid/" + this.UrlParams["Cid"].replace("/", "") + "/componentid/" + this.UrlParams["ComponentId"] + "/showrating/true/RatingID/" + this.UrlParams["Rating"]
      // let navigationExtras = this.Commonutilites.GetQueryStringValues(RedirectURL)
      // this.router.navigate(['/' + navigationExtras["contexttitle"], navigationExtras["params"]]);
      this.commonProxyService.setCookie('RedirectURLfromLogin', RedirectURL)
    }

    if (this.UrlParams["ReturnURL"] == undefined || this.UrlParams["ReturnURL"] == null) {
      //if ( this.UrlParams["contentid"] != null || Not Session("SubscribeContent") Is Nothing){
      if (this.UrlParams["contentid"] != null) {
        if (this.UrlParams["subSiteID"] != undefined && this.UrlParams["subSiteID"] != null) {
          //PerformAutologinSubsiteContentandAssign()
        }
        else {
          this.PerformContentSpecificActions()
        }
        return false;
      }
    }
    // else if (Not urlParams("showexperts") Is Nothing ){
    //   if (IsNothing(GetProperty("expertmenuid")) OrElse GetProperty("expertmenuid") = "")
    //   Response.Redirect("~/default.aspx")
    //   else{
    //     if (IsNothing(urlParams("type")) OrElse urlParams("type") = "" )
    //     Response.Redirect(ApplicationURL & "/default.aspx?menuid=" & GetProperty("expertmenuid") & "&ConnectingUserID=" & urlParams("ConnectingUserID"))
    //     else{
    //       Response.Redirect(ApplicationURL & "/default.aspx?menuid=" & GetProperty("expertmenuid") & "&type=members&ConnectingUserID=" & urlParams("ConnectingUserID"))
    //     } 
    //   }


    // Dim catalogMenuId = GetConfigKeyValue("CatalogMenuID")
    // If Not urlParams("catalogreturnmenuid") Is Nothing AndAlso urlParams("catalogreturnmenuid") <> "" Then
    // catalogMenuId = urlParams("catalogreturnmenuid")
    // End If
    // usrContext = CType(Session("UserContext_" & SiteID.ToString), UserContext)
    // If Not IsNothing(usrContext) Then
    // If Not IsNothing(GetProperty("affiliation")) AndAlso CType(GetConfigKeyValue("EnableAffiliate"), Boolean) AndAlso GetProperty("affiliation") <> "" Then
    // Response.Redirect("~/Default.aspx?affiliation=true")
    // ElseIf Not IsNothing(urlParams("lpsignin")) OrElse urlParams("lpsignin") <> "" Then
    // Response.Redirect("~/Default.aspx?menuid=" & GetProperty("lpsignupmenuid") & "&lpsignin=true")
    // Else
    // If urlParams("RegistertoPurchase") = "1" Then
    // Dim pageqryStr As String = ""
    // If urlParams("page") <> "" Then
    // pageqryStr &= "/page/" & urlParams("page")
    // End If
    // If urlParams("AgreementRedirect") = 1 Then
    // If Not IsNothing(urlParams("DmnID")) Then
    // Response.Redirect("default.aspx?menuid=" & urlParams("DmnID").ToString() & "&ACRedirect=1&contentid=" & Session("ContentId"), True)
    // Else
    // 'Response.Redirect("default.aspx?menuid=" & catalogMenuId & "&cntId=" & Session("ContentId") & "&ACRedirect=1&Search=true", True)
    // 'Catalog
    // 'Response.Redirect(ApplicationURL + "/" + GetConfigKeyValue("CatalogMenuName") + "/cntId/" & Session("ContentId") & "/ACRedirect/1/Search/true" + pageqryStr, True)
    // If(Session("CatelogReturnUrl") Is Nothing) Then
    // If Not urlParams("subSiteID") Is Nothing AndAlso urlParams("subSiteID") <> "" Then
    // Response.Redirect(ApplicationURL + "/" + GetConfigKeyValue("CatalogMenuName") + "/cntId/" & Session("ContentId") & "/ACRedirect/1/Search/true/subSiteID/" + urlParams("subSiteID") + pageqryStr, True)
    // Else
    // Response.Redirect(ApplicationURL + "/" + GetConfigKeyValue("CatalogMenuName") + "/cntId/" & Session("ContentId") & "/ACRedirect/1/Search/true" + pageqryStr, True)
    // End If

    // Else
    // Dim strrtnurl As String = Session("CatelogReturnUrl")
    // Session.Remove("CatelogReturnUrl")
    // If Not urlParams("subSiteID") Is Nothing AndAlso urlParams("subSiteID") <> "" Then
    // Response.Redirect(strrtnurl + "/cntId/" & Session("ContentId") & "/ACRedirect/1/Search/true/subSiteID/" + urlParams("subSiteID") + pageqryStr, True)
    // Else
    // Response.Redirect(strrtnurl + "/cntId/" & Session("ContentId") & "/ACRedirect/1/Search/true" + pageqryStr, True)
    // End If
    // End If
    // End If
    // Else
    // 'Response.Redirect("default.aspx?menuid=" & catalogMenuId & "&Itemrequested=1", True)
    // Response.Redirect(ApplicationURL + "/" + GetConfigKeyValue("CatalogMenuName") + "/Itemrequested/1" + pageqryStr, True)
    // End If
    // Else
    // ExecuteOnAttendanceRules()
    // ExecuteEnrollRules()
    // If Not strAutoAssignKey Is Nothing AndAlso strAutoAssignKey <> "" AndAlso strAutoAssignKey.Length = 12 Then
    // Dim dsSiteURL As DataSet
    // dsSiteURL = rmc.GetSiteURL(SiteID)
    // strLearnerURL = IIf(IsDBNull(dsSiteURL.Tables(0).Rows(0)("LearnerSiteURL")), "", dsSiteURL.Tables(0).Rows(0)("LearnerSiteURL"))
    // strLMSSiteURL = IIf(IsDBNull(dsSiteURL.Tables(0).Rows(0)("SiteURL")), "", dsSiteURL.Tables(0).Rows(0)("SiteURL"))
    // If strLearnerURL <> "" Then
    // strSiteURL = strLearnerURL
    // Else
    // strSiteURL = strLMSSiteURL
    // End If
    // Dim autolaunchFirstCourseURL As String = ""
    // If Not autolaunchFirstCourse Is Nothing AndAlso autolaunchFirstCourse <> "" AndAlso autolaunchFirstCourse.ToLower = "true" Then
    // autolaunchFirstCourseURL = "/autolaunchFirstCourse/true"
    // End If
    // ''''Start Sitaram added if condition for auto assign from sub site on 24 - 12 - 2014
    // If Not GetConfigKeyValue("LearnerLogOut") Is Nothing AndAlso GetConfigKeyValue("LearnerLogOut") <> "" AndAlso GetConfigKeyValue("LearnerLogOut") <> strSiteURL Then
    // Response.Redirect(ApplicationURL & "/LogOff/true/JoinURL/true/SubSiteID/" & strAutoAssignSiteID & "/AutoAssignkey/" & strAutoAssignKey & "/FromLogin/true")
    // Else
    // rmc.GetAutoKeyContents()
    // ApplicationSet(UserName + "|" + UserEmail + "|" + CStr(UserID) + "|" + SiteID.ToString, SessionID & "|" & Now & "|" & HttpContext.Current.Server.MachineName)
    // Response.Redirect(ApplicationURL & "/" & GetContextMenuName(GetConfigKeyValue("MyLearningMenuID")) & autolaunchFirstCourseURL, True)
    // End If
    // ElseIf urlParams("backreturnurl") <> "" Then
    // Dim strreturnurl As String = urlParams("backreturnurl")
    // strreturnurl = "//" & strreturnurl.Replace("~~", "/")
    // Response.Redirect(ApplicationURL & strreturnurl)
    // ElseIf Not Session("ReturnURL") Is Nothing AndAlso Session("ReturnURL") <> "" Then
    // Dim StrsessionRurl As String = Session("ReturnURL").ToString()
    // Response.Redirect(GetInviteURLlink_NEW(Session("Returnurl").ToString()))
    // ElseIf urlParams("isPurchaseSampleContent") = "true" Then
    // Response.Redirect(ApplicationURL & "/BuyAttempt.aspx?SampleContent=true&contentid=" & urlParams("purchasecontentid"), False)
    // Else

    // GenerateTinCanAPIStatements(SiteID)
    // Session("LRsTracking") = True
    // 'Bala INST-2600 Splash page and Search Customization Development 3-6-2014
    // If LCase(GetConfigKeyValue("EnableSplashPage")) = "true" Then
    // Response.Redirect("~/Modules/Splashpage.aspx?&searchResultmenuid=" & GetProperty("searchResultmenuid"))
    // ElseIf urlParams("backreturnurl") <> "" Then
    // Dim strreturnurl As String = urlParams("backreturnurl")
    // strreturnurl = "//" & strreturnurl.Replace("~~", "/")
    // Response.Redirect(ApplicationURL & strreturnurl)
    // Else
    // Response.Redirect("~")
    // End If
    // End If
    // End If
    // End If
    // End If
    // End If
  }

  RedirectURL
  async PerformContentSpecificActions() {
    this.RedirectURL = this.Commonutilites.ApplicationURL() + "/";
    let AlertMsg: String = ""
    let s: String = this.ParametersObj.ComponentInstanceID
    let dfsf = false

    if (dfsf) {
      //if (Session("SubscribeContent") != null) {
      // If (HasPrivilege(MyCatalogPrivileges.View) Or HasPrivilege(MyCatalogPrivileges.ViewByCategory) Or HasPrivilege(MyCatalogPrivileges.ViewByType)) Then
      //     SubscribeContent(Session("SubscribeContent"))

      //     'rmc.AssignToMyCatalog(UserID, Session("SubscribeContent"), "", Date.Now, OrgUnitID, UserID)
      //     RedirectURL = ApplicationURL & "/" & GetConfigKeyValue("MyCatalogMenuName")
      // Else
      //     AlertMsg = Localization.GetString("login_alert_noprivilegetoviewmycatalog")
      // End If
      // Session("SubscribeContent") = Nothing
    }
    else {
      let viewtype = -1;
      let dtContentDetails: any = await this.rmc.GetContentDetailsFromCDP(this.UrlParams["contentid"])

      if (dtContentDetails != undefined && dtContentDetails != '' && dtContentDetails.Table.length > 0) {
        viewtype = dtContentDetails.Table[0].ViewType
      }
      switch (viewtype) {

        case Number(ContentAccessRule.Subscription): {

          if (this.Commonutilites.hasPrivilege(MyCatalogPrivileges.View) || this.Commonutilites.hasPrivilege(MyCatalogPrivileges.ViewByCategory) || this.Commonutilites.hasPrivilege(MyCatalogPrivileges.ViewByType)) {
            let drContent = await this.rmc.getContentDetails(this.UrlParams["contentid"].toString())
            if (drContent.Table[0].ObjectTypeID == ObjectTypes.Events) {
              let isWaitListContent: Boolean = false
              if (drContent.Table[0].WaitListEnrolls > 0 || (drContent.Table[0].EnrollmentLimit <= drContent.Table[0].TotalEnrolls && drContent.Table[0].EnrollmentLimit != 0)) {
                isWaitListContent = true
              }

              if (isWaitListContent) {
                //Session("WaitListContentID") = urlParams("contentid")
                this.RedirectURL = this.Commonutilites.ApplicationURL() + "/" + this.Commonutilites.GetConfigKeyValue("CatalogMenuName")
                //Response.Redirect(RedirectURL)
                return false;
              }
              else {
                this.rmc.AssignToMyCatalog(this.Commonutilites.UserID, this.UrlParams["contentid"], "", Date(), this.Commonutilites.OrgUnitID(), this.Commonutilites.UserID)
                //SendEventRegistrationMail(urlParams("contentid"), drContent("Bit2").ToString())
              }
            }
            else {
              this.rmc.AssignToMyCatalog(this.Commonutilites.UserID, this.UrlParams["contentid"], "", Date(), this.Commonutilites.OrgUnitID(), this.Commonutilites.UserID)
              if (drContent.Table[0].ObjectTypeID == ObjectTypes.Track) {
                if (this.Commonutilites.GetConfigKeyValue("enablecoursepackaging") != undefined) {
                  if (this.Commonutilites.GetConfigKeyValue("enablecoursepackaging") == "true") {
                    //   if (Not Session("hdnSelectedBlockItems") Is Nothing) Then
                    //   // InsertSelectedBlockItems(urlParams("contentid"), Session("hdnSelectedBlockItems"), 1)
                    //   // Session("hdnSelectedBlockItems") = Nothing
                    // }
                  }
                }
              }
            }
            if (dtContentDetails.Rows(0)("ObjectTypeID").toString() == ObjectTypes.Events) {
              //ExecuteEventWorkflowRules("onenroll", urlParams("contentid"))
            }
            this.RedirectURL = this.Commonutilites.ApplicationURL + "/" + this.Commonutilites.GetConfigKeyValue("MyCatalogMenuName")
          }
          else {
            AlertMsg = this.Commonutilites.GetLocalizationString("login_alert_noprivilegetoviewmycatalog")
          }

        }
          break;
        case Number(ContentAccessRule.View): {
          if (this.Commonutilites.hasPrivilege(CatalogPrivileges.View))
            if (this.UrlParams["IsDVIWSLE"].toLowerCase() == "true") {
              if (this.Commonutilites.hasPrivilege(MyCatalogPrivileges.View) || this.Commonutilites.hasPrivilege(MyCatalogPrivileges.ViewByCategory) || this.Commonutilites.hasPrivilege(MyCatalogPrivileges.ViewByType)) {
                this.rmc.AssignToMyCatalog(this.Commonutilites.UserID, this.UrlParams["contentid"], "", Date(), this.Commonutilites.OrgUnitID(), this.Commonutilites.UserID)
                this.RedirectURL = this.Commonutilites.ApplicationURL() + "/" + this.Commonutilites.GetConfigKeyValue("MyCatalogMenuName")
              }
              else {
                AlertMsg = this.Commonutilites.GetLocalizationString("login_alert_noprivilegetoviewmycatalog")
              }
            }
            else {
              this.RedirectURL = this.Commonutilites.ApplicationURL() + "/" + this.Commonutilites.GetConfigKeyValue("CatalogMenuName")
              //Session("pContentID") = this.UrlParams("contentid")
              this.commonProxyService.setSessionStorage('pContentID', this.UrlParams["contentid"])
            }
          else {
            AlertMsg = this.Commonutilites.GetLocalizationString("login_alert_noprivilegetoviewmycatalog")
          }

        }
          break;
        case Number(ContentAccessRule.ECommerce): {
          //   If HasPrivilege(MyCartPrivileges.View) Then
          //   Dim CartID As String
          //   Dim usrContext As UserContext = CType(Session("UserContext_" & SiteID.ToString), UserContext)
          //   If HasPrivilege(UserPrivileges.AllowMultiLogin) Then
          //   CartID = Session("SessionID")
          //   Else
          //   CartID = String.Empty
          //   End If
          //   If usrContext Is Nothing Then
          //   CartID = Session("SessionID")
          //   End If
          //   Dim eCartObj As eShoppingCart
          //   Try
          //   eCartObj = rmc.GetCartObject(UserID, CartID)
          //   eCartObj.AddItem(urlParams("contentid"), 1)
          //   Catch ex As Exception
          //   Dim scriptKey As String = "OnLoadAlertMessage:" + Me.UniqueID
          //   If Not Page.ClientScript.IsStartupScriptRegistered(scriptKey) Then
          //   Dim errMsg As String = ex.Message
          //   Dim sIndex As Integer = errMsg.ToLower().IndexOf("sqlerror:")
          //   If sIndex <> -1 Then
          //   errMsg = errMsg.Substring(sIndex + 9)
          //   End If
          //   errMsg = errMsg.Replace("'", "''")
          //   errMsg = errMsg.Replace("""", """""")
          //   Dim scriptBlock As String = "<script language=""JavaScript"">" & _
          //   "alert('" & errMsg & "')" & _
          //   "</script>"
          //   Page.ClientScript.RegisterStartupScript(GetType(Page), scriptKey, scriptBlock)
          //   End If
          //   End Try
          //   If urlParams("action") = "purchase" Then
          //   RedirectURL = SecureApplicationURL & "/" & GetConfigKeyValue("MyCartMenuName") & "/action/checkout"
          //               else {
          //     RedirectURL = ApplicationURL & "/" & GetConfigKeyValue("MyCartMenuName")
          //   }


          //           else {
          //     AlertMsg = Localization.GetString("login_alert_noprivilegetoviewmycart")
          //   }

          // }
          // End Select



        }
          break;
      }
    }
    let navigationExtras = this.Commonutilites.GetQueryStringValues(this.RedirectURL)
    this.router.navigate(['/' + navigationExtras["contexttitle"], navigationExtras["params"]]);
  }



  navigateTo() {
    if (this.RedirectedUrl != "") {
      this.router.navigate([this.RedirectedUrl]);
    }
    // else {
    //   if (this.leftnavigation[0].contextmenutitle != '#') {
    //     this.router.navigate([this.leftnavigation[0].contextmenutitle]);
    //   }
    //   else {
    //     this.router.navigate([this.leftnavigation[0].children[0].contextmenutitle]);
    //   }
    // }
  }


  async ValidateLogin(objUserStatus: UserStatus, Locked: number, RemainingDaysToChangePassword: number,
    InvalidLoginAttemptNo: number, LockedBy: String, intLockedTime: number, verifyGroupStatus: GroupStatus) {

    if (this.commonProxyService.checkCookieAvailable('userContext_' + this.Commonutilites.LearnerURL())
      && sessionStorage.getItem('userContext_' + this.Commonutilites.LearnerURL()) != null
      && JSON.parse(sessionStorage.getItem('userContext_' + this.Commonutilites.LearnerURL())) !== '') {
      this.usercontext = new Usercontext(JSON.parse(sessionStorage.getItem('userContext_' + this.Commonutilites.LearnerURL())));

      if (this.usercontext.UserID === undefined || this.usercontext.UserID === 0) { return false; }
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.append('UserID', this.usercontext.UserID.toString());
      urlSearchParams.append('SiteId', this.usercontext.SiteID.toString());
      let Parameters = urlSearchParams.toString();

      this.rmc.GetUserMembershipLevel(Parameters).subscribe(
        data => this.usercontext.Membership = Number(data)
      );

      if (verifyGroupStatus === GroupStatus.Expired) { return false; }
      intLockedTime = await this.rmc.GetUserLockedTime(this.usercontext.UserID);
      if (intLockedTime > 0) {
        return false;
      }
      if (this.Commonutilites.hasPrivilege(UserPrivileges.AllowMultiLogin)) {
        // AllowLogin = True
        // Dim guidObj As New Guid
        // Session("MultiSessionID") = Guid.NewGuid.ToString
      }
      return true;
    }
    else { return false; }
  }

}

