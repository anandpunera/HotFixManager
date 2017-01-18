var AdmZip = require('adm-zip');
var zipFolder = require('zip-folder');
var fs = require('fs');
var async = require('async');
var zipFolder = require('zip-folder');
var Datastore = require('nedb');  
var readline = require('readline');
var Backup='../BackUp';
var path = require('path');
var csawar_lib="../../jboss-as/standalone/deployments/csa.war/WEB-INF/lib";
var portal="../../portal"; 
var UnzipDirectory; 
var serialnumber;
var rl = readline.createInterface(process.stdin, process.stdout);
if(!fs.existsSync(db))
  {
    var db = new Datastore({filename : 'HotFixRecord'});
    db.loadDatabase();
  }
if(!fs.existsSync(dbLog))
  {
    var dbLog = new Datastore({filename : 'HotFixRecordLog'});
    dbLog.loadDatabase();
  }
  
  if(process.argv[2]!='-list')
      var hotfx=process.argv[3].split('.')[0];

  var deployMain= function()
    {
       var Time =new Date;
       var startTime=Time.getFullYear()+':'+Time.getMonth()+':'+Time.getDay()+':'+Time.getHours()+':'+Time.getMinutes()+':'+Time.getSeconds();
       console.log('\n**************************Welcome to CSA HotFix Deployer***********************\n\n'+startTime+'\n');
       if(fs.existsSync('../'+process.argv[3]))
        {
          var hotfixName;
          db.count({process : 'deploy',status:'success',hotfixname: hotfx}, function (err,countDeploy)
            { 
                if(countDeploy>0)
                  {
                    console.log('......Sorry!! The hotfix '+hotfx+' is already deployed');
                    process.exit(1);
                  }
                 else
                  {  
                    //prompt user and warn that service shall be stopped before  starting deployment
                    rl.setPrompt('Please Note!! services will be stopped and started during Deployement. \n\n HIT "Y" if you wish to continue or HIT "N" to abort deployement  \n ');
                    rl.prompt();
                    rl.on('line', function(line) 
                    {
                      if (line === "Y"||line=="y") rl.close();
                      else   
                      process.exit(1);
                    }).on('close',function()
                      {
                        db.count({process:'deploy',status:'success'}, function (err,count)
                          {
                            var serialnumber=count+1;
                            db.insert({hotfixNumber:serialnumber, hotfixname : hotfx, Updated_On: startTime, process:'deploy',status:'in progress'});
                            dbLog.insert({hotfixNumber:serialnumber, hotfixname : hotfx, Updated_On: startTime, process:'deploy',status:'in progress'});
                          });
                        var stopServicePromise= new Promise(function(resolve, reject)
                          {
                              stopServices(resolve, reject);
                          })
                          stopServicePromise.then(function(e)
                              {
                                var Promise_unzipAndDeployHotfix = new Promise(function(resolve_Promise_unzipAndDeployHotfix, reject_Promise_unzipAndDeployHotfix)
                                     {  
                                        unzipAndDeployHotfix('../'+process.argv[3], resolve_Promise_unzipAndDeployHotfix, reject_Promise_unzipAndDeployHotfix);
                                     });
                                  Promise_unzipAndDeployHotfix.then(function(e)
                                      {
                                        startCSA_RecordInDB(hotfx);
                                      }).catch(function(e) 
                                        { 
                                            console.log('......Alas! Deployement was unsuceessful..\n   \n  starting services  \n'+e); 
                                            db.find({hotfixname: hotfx,process:'deploy',status:'in progress'}, function (err,docs)
                                              {
                                                if(docs.length>0)
                                                {
                                                  db.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'deploy',status:'failure'});
                                                  dbLog.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'deploy',status:'failure'});
                                                  db.remove ({hotfixname: hotfx,process:'deploy',status:'in progress'}, {});
                                                }
                                              });
                                             
                                            startServices();
                                        });
                                }).catch(function(e)
                                {
                                  console.log('\n\n      Sorry!! could not stop services..Looks like Some services were already stopped \n       Try again\n');
                                  startServices();
                          });
                      });      
                    }
              }); 
        }
     else 
       console.log('......The hotfix '+process.argv[3]+' is not present in the hotfixes directory');
    }
   // The program start here
//node hotfixManager.js -deploy Hotfix.zip
   if(process.argv[2]=='-deploy')
    {  
      deployMain();
    }
//this function calls startServices() and makes an entry into HotFixRecord
var startCSA_RecordInDB=function(hotfx)
{
   var Time =new Date;
   var startTime=Time.getFullYear()+':'+Time.getMonth()+':'+Time.getDay()+':'+Time.getHours()+':'+Time.getMinutes()+':'+Time.getSeconds();
   console.log('......HotFix Record File exists');
    db.find({status : 'deployed',hotfixname: hotfx}, function (err,docs)
           { 
             if(docs.length>0)
              {
                console.log('......The hotfix is already deployed');
              }
             else
              { 
                 db.find({hotfixname: hotfx,process:'deploy',status:'in progress'}, function (err,docs)
                  {
                    if(docs.length>0)
                    {
                     db.remove({hotfixname: hotfx,process:'undeploy',status:'success'}, { multi: true }, function (err, numRemoved){ 
                      }); 
                      db.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'deploy',status:'success'});
                      dbLog.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'deploy',status:'success'});
                      db.remove ({hotfixname: hotfx,process:'deploy',status:'in progress'}, {});
                      db.remove({hotfixname: hotfx,process:'deploy',status:'failure'}, { multi: true }, function (err, numRemoved){ 
                      });
                    }
                  }); 
                   db.find({hotfixname: hotfx,process:'deploy',status:'failure'}, function (err,docsFail)
                      {
                        if(docsFail.length>0)
                          {
                            db.remove({hotfixname: hotfx,process:'deploy',status:'failure'}, { multi: true }, {});
                          }
                      });
                 console.log('...... Hotfix '+process.argv[3]+ ' ......Deployed.. Restarting CSA Service');
                 startServices();
              }
            });
} 

//undeploy execution thread starts from here
if(process.argv[2]=='-undeploy')
  { 
    var Time =new Date;
    var startTime=Time.getFullYear()+':'+Time.getMonth()+':'+Time.getDay()+':'+Time.getHours()+':'+Time.getMinutes()+':'+Time.getSeconds();
    console.log('\n**************************Welcome to CSA HotFix Deployer***********************\n\n'+startTime+'\n');
   // var hotfx=process.argv[3].split('.')[0];
    db.find({process : 'deploy',status:'success',hotfixname: hotfx}, function (err,docs)
      { 
        if(docs.length<=0)
          {
             console.log('......No such hotfix (' +hotfx+') to undeploy');
             process.exit(1);
          }
        else
          {
            db.count({process : 'deploy',status:'success'},function (err,countDeployed)
               {
                  var serial=docs[0]['hotfixNumber'];
                  var undeployTheseFirst= new Array;
                  if(countDeployed>serial)
                    {
                      console.log(' Sorry!! There were some hotfixes that were deployed on top of hotfix '+hotfx +'\n Cannot Proceed with undeployement \n First undeploy the hotfixes below in Order\n ');
                      for(var j=countDeployed;j>serial;j--)
                        { 
                          var sequence=0;
                          db.find({hotfixNumber:j,process:'deploy', status:'success'}, function (err,docss)
                                { 
                                  ++sequence;
                                  console.log(' '+sequence+'  '+docss[0]['hotfixname']+'\n ');
                                    if(docss[0]['hotfixNumber']==serial+1)
                                      {
                                        process.exit(1);
                                      }
                                });
                        }
                    }
                  else
                    {
                        rl.setPrompt('\n Please Note!! services will be stopped and started during UnDeployement. \n\n HIT "Y" if you wish to continue or HIT "N" to abort UnDeployement  \n ');
                        rl.prompt();
                        rl.on('line', function(line) {
                        if (line === "Y"||line=="y") 
                            rl.close();
                        else 
                        {  
                            process.exit(0); 
                        }
                        }).on('close',function()
                          {  
                            db.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'undeploy',status:'in progress'});
                            dbLog.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'undeploy',status:'in progress'});
                            var stopServicePromise= new Promise(function(resolve, reject)
                              {
                                stopServices(resolve, reject);
                              });
                            stopServicePromise.then(function(e)
                              {
                                undeploy(hotfx);
                              }).catch(function(e)
                              {
                                console.log('.....cannot proceed with undeployement');
                              });
                            });
                        }
                    });
                }
      });
  }
//List the hotfixes that are currently deployed
  if(process.argv[2]=='-list')
    {  
       var Time =new Date;
       var startTime=Time.getFullYear()+':'+Time.getMonth()+':'+Time.getDay()+':'+Time.getHours()+':'+Time.getMinutes()+':'+Time.getSeconds();
       console.log('\n**************************Welcome to CSA HotFix Deployer***********************\n\n'+startTime+'\n');
       db.find({status : 'success',process:'deploy'}, function (err,docs)
          { 
            if(docs.length>0)
            {
              for(var k=0;k<docs.length;k++)
              {
                db.find({status : 'success',process:'undeploy',hotfixname:docs[k]['hotfixname']}, function (err,docss)
                {
                  if(docss.length==0)
                  {
                     console.log(docs);
                     process.exit(1);
                  }
                });
              }
            }
            else
                {
                    console.log('......No Hotfixes are currently deployed \n');
                    process.exit(1);
                }
             
          }); 
      
     }

//function that creates directory with a given name at a given location
var mkdirSync = function (path) 
{
  try 
  {
    fs.mkdirSync(path);
    console.log('......directory '+path+' created successfully \n');
  } 
  catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
  }
}
//function to create BackUp Directory structure for Jar files in the hotfix
 function createJarBackupDirectory(folder)
  {
    var res=csawar_lib.split("/");
    var dir=Backup;
    dir=dir+'/'+folder;
    if (!fs.existsSync(dir)) 
      {
        mkdirSync(dir);
      }
    for(var j=2;j<=res.length-1;j++)
      { 
        dir=dir+'/'+res[j];
        if (!fs.existsSync(dir)) 
          {
             mkdirSync(dir);
          }
       if(j==res.length-1)
         {
            console.log('......Jar BackUp Directory '+dir+' Created\n');
         }
      }
   return dir;
 }
 //function to create BackUp Directory structure for MPP javascript files in the hotfix
function createJsBackupDirectory(directoryStructure,createHere)
  {
    var res=directoryStructure.split("/");
    createHere=Backup+'/'+createHere;
    var dirRecursive=createHere;
    if(!fs.existsSync(createHere))
      {
        mkdirSync(createHere);
      }
    while(res[0]!='portal')
    {
      res.shift();
    }
    for(var i=0;i<res.length;i++)
    {
      dirRecursive=dirRecursive+'/'+res[i];
      if(!fs.existsSync(dirRecursive))
        {
           mkdirSync(dirRecursive);
           console.log('......Js BackUp Directory '+dirRecursive+' Created\n');
        }
    }
     return dirRecursive;
  }
//Scans for MPP JS files and proceeds to deployement
var scanforMppjsfiles=function(home,resolve_scanforMppjsfiles, reject_scanforMppjsfiles)
  {
    scan(home,'.js',function(err, files) 
      {
        var folderName;
        for(var i=home.length;i>=0;i--)
          {
            if(home[i]=='/')
             {
               folderName=home.substring(i+1,home.length);
             }
          }
         if(files.length>0)
           {
              if(!fs.existsSync(Backup))
              mkdirSync(Backup);
           }
        files.forEach(function(file)
          {
            var fileCurrent=file;
            var fileCurrentTemp=file;
            var fileCurrentTemp2;
            for(var j=fileCurrent.length;j>0;j--)
              {
                if(fileCurrent[j]=='/')
                  {
                    fileCurrentTemp2=fileCurrent.substring(j+1,fileCurrent.length); //name of the .js file
                    fileCurrentTemp=fileCurrent.substring(0,j);//directory structure where .js file resides.
                    var indexhtml=fileCurrentTemp+'..';
                    break;
                  }
               }
            var dir=createJsBackupDirectory(fileCurrentTemp,folderName); //create directory to backUp .js file
            var res=dir.split('/');
            while(res[0]!='portal')
             {
               res.shift();
             }
            var BackUpfrom='../../'+res[0];
            for(var j=1;j<res.length;j++)
             {
                BackUpfrom+='/'+res[j];
                if(j==res.length-2)
                  {
                      BackUpHtmlFrom=BackUpfrom;
                  }
              }
            var filestobackup=fs.readdirSync(BackUpfrom);
            for(var i=0;i<filestobackup.length;i++)
              {
                 if(!fs.existsSync(dir+'/'+filestobackup[i]))
                    {
                      fs.writeFileSync(dir+'/'+filestobackup[i], fs.readFileSync(BackUpfrom+'/'+filestobackup[i]));
                    }
              }
            replaceJsFiles(BackUpfrom,fileCurrent,fileCurrentTemp2,resolve_scanforMppjsfiles, reject_scanforMppjsfiles);//BackUpFrom=destination where js files will be replaced   fileCurrentTemp = location from where we read js files  fileCurrentTemp2= name of js file
            var dirhtml;
            var htmlfile;
            for(var j=dir.length;j>0;j--)
             {
               if(dir[j]=='/')
                 {
                    dirhtml=dir.substring(0,j);
                    break;
                 }
             }
          for(var j=fileCurrentTemp.length;j>0;j--)
             {
              if(fileCurrentTemp[j]=='/')
               {
                 htmlfile=fileCurrentTemp.substring(0,j);
                //console.log(htmlfile);
                 break;
               }
            }
          if(!fs.existsSync(dirhtml+'/'+'index.html'))
            {
               fs.writeFileSync(dirhtml+'/'+'index.html', fs.readFileSync(BackUpHtmlFrom+'/'+'index.html'));
            }
          fs.writeFileSync(BackUpHtmlFrom+'/'+'index.html', fs.readFileSync(htmlfile+'/'+'index.html'));
        });
      });
  
  }
//replaces the previous MPP js files with the MPP js files in the hotfix 
var replaceJsFiles = function(destination, source, name,resolve_scanforMppjsfiles, reject_scanforMppjsfiles)
 { 
   var typeofjs;
   var randomjsnumber;
 //console.log('......\n\n'+name);
   for(var j=0;j<name.length;j++)
     {
       if(name[j]=='.')
         {
           typeofjs=name.substring(j+1,name.length);
           randomjsnumber=name.substring(0,j);
         }
     }
   scan(destination,'.js',function(err, files) 
     {
       files.forEach(function(file)
         {
           for(var j=0;j<file.length;j++)
             { 
               if(file[j]=='.')
                 {
                   TypeOfJSfile=file.substring(j+1,file.length);
                 }
               if(TypeOfJSfile==typeofjs)
                 {  
                   if(fs.existsSync(file))
                   fs.unlinkSync(file);
                   fs.writeFileSync(destination+'/'+name, fs.readFileSync(source));
                 }
              }
            if(files.indexOf(file)==files.length-1)
              {
                  resolve_scanforMppjsfiles();
              }
            });
          });
    }

//replaces the backed Up MPP js files with the  hotfix js files
//destination=\portal\node_modules\mpp-ui\dist\scripts  \\source=complete name of the .js file from BackUp  \\name=complete name of the .js file
var replaceJavaScriptFiles = function(destination, source, name)
  { 
    var typeofjs;
    nameSplit= name.split('.');
    typeofjs=nameSplit[1]+'.'+nameSplit[2];
    scan(destination,typeofjs,function(err, files) 
      {
        files.forEach(function(file)
          { 
            console.log('......replacing file '+file+'with file '+source+'\n');
            fs.unlinkSync(file);
            fs.writeFileSync(destination+'/'+name, fs.readFileSync(source));
          }); 
        });
   }
   //function to scan for all jar files that have been unzipped and deploy
   var scanforUnZipjarfiles=function(resolve_scanforUnZipJarfiles,reject_scanforUnZipJarfiles)
     {
       scan(UnzipDirectory,'.jar',function(err, files) 
         {
           // Do something with files that ends in '.jar'.
           var folderName;
           for(var i=UnzipDirectory.length;i>=0;i--)
              {
                if(UnzipDirectory[i]=='/')
                  {
                    folderName=UnzipDirectory.substring(i+1,UnzipDirectory.length);
                  }
              }
            if(files.length>0 )
             {
                if(!fs.existsSync(Backup))
                 {
                   mkdirSync(Backup);
                   console.log('......created '+Backup+'  directory');
                 }
               else 
                 console.log('......directory '+Backup+' already exists');
             }
           
            files.forEach(function(file)
                {
                   var fileCurrent=file;
                   var fileCurrentTemp=file;
                   var fileCurrentTemp2=file;
                   
                   for(var j=fileCurrent.length;j>0;j--)
                    {
                      if(fileCurrent[j]=='/')
                        {
                         fileCurrent=fileCurrent.substring(j+1,fileCurrent.length);
                         fileCurrentTemp=fileCurrentTemp.substring(0,j);
                         break;
                        }
                    }
                   var dir=Backup;
                   dir=dir+'/'+folderName;
                   if (!fs.existsSync(dir)) 
                     {
                       mkdirSync(dir);
                     }
                     if(fs.existsSync(csawar_lib+'/'+fileCurrent))
                     {
                        fs.writeFileSync(dir+'/'+fileCurrent, fs.readFileSync(csawar_lib+'/'+fileCurrent));
                        fs.unlinkSync(csawar_lib+'/'+fileCurrent);
                        fs.writeFileSync(csawar_lib+'/'+fileCurrent, fs.readFileSync(file)); 
                        if(files.indexOf(file)==files.length-1)
                        {
                         // startCSA_RecordInDB(folderName);
                          resolve_scanforUnZipJarfiles();
                        }
                     }
                     else
                     {
                        console.log('Jar file  '+csawar_lib+'/'+fileCurrent+'  doesnot exist. Please check whether the Hotfix applies for this release');
                        reject_scanforUnZipJarfiles();
                    }
                  }); 
        });
  }
var undeploy= function(hotfx)
 { 
   var searchFilesIn=Backup+'/'+hotfx;
   scan(searchFilesIn,'.jar',function(err, files)
    {
      files.forEach(function(file)
       { 
         console.log(file+'\n');
         var fileCurrent=file;
         var fileCurrentTemp=file;
         var fileCurrentTemp2=file;
         for(var j=fileCurrent.length;j>0;j--)
           {
             if(fileCurrent[j]=='/')
               {
                 fileCurrent=fileCurrent.substring(j+1,fileCurrent.length);
                 fileCurrentTemp=fileCurrentTemp.substring(0,j);
                 break;
               }
            }
          if(fs.existsSync(csawar_lib+'/'+fileCurrent))
          {
            fs.writeFileSync(csawar_lib+'/'+fileCurrent, fs.readFileSync(file));
          }
          if(files.indexOf(file)==files.length-1)
            {  
                db.find({hotfixname: hotfx,process:'undeploy',status:'in progress'}, function (err,docs)
                  {
                    if(docs.length>0)
                    {
                      db.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'undeploy',status:'success'});
                      dbLog.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'undeploy',status:'success'});
                      db.remove ({hotfixname: hotfx,process:'undeploy',status:'in progress'}, {});
                      db.remove ({hotfixname: hotfx,process:'deploy',status:'success'}, {});
                    }
                  }); 
               startServices();
            }
        });
     });
    scan(searchFilesIn,'.js',function(err, files)
      {  
        var htmlreplaced=false;
        if(files.length>0)
        console.log('These .js files were found in the BackUp \n');
        files.forEach(function(file)
          {  
            console.log('\n'+file);
            var fileCurrent=file;
            var fileCurrentTemp=file;
            var fileCurrentHtml;
            for(var j=fileCurrent.length;j>0;j--)
              {
                if(fileCurrent[j]=='/')
                  {
                     fileCurrent=fileCurrent.substring(j+1,fileCurrent.length); //complete name of the js file
                     fileCurrentTemp=fileCurrentTemp.substring(0,j); //path of the directory where js file is there
                     break;
                  }
              }
            var result=file.split('/');
            var pathtojs='../..';
            var pathtoindex;
            var pathtoscript;
            for(var j=0;j<result.length;j++)
              {
                if(j>=result.indexOf('portal'))
                  {
                    if(result[j]=='scripts')
                      {
                        pathtoindex=pathtojs;
                      }
                    pathtojs+='/'+result[j];
                    if(result[j]=='scripts')
                      {
                        pathtoscript=pathtojs;
                      }
                  }
              }
            for(var j=fileCurrentTemp.length;j>0;j--)
              {
                if(fileCurrentTemp[j]=='/')
                  {
                    fileCurrentHtml=fileCurrentTemp.substring(0,j);
                    break;
                  }
              }
            fs.writeFileSync(pathtoindex+'/index.html', fs.readFileSync(fileCurrentHtml+'/index.html'));
            replaceJavaScriptFiles(pathtoscript,file,fileCurrent); //pathtoscript=\portal\node_modules\mpp-ui\dist\scripts  \\file=.js file from BackUp  \\fileCurrent=complete name of the js file
            if(files.indexOf(file)==files.length-1)
            {  
               db.find({hotfixname: hotfx,process:'undeploy',status:'in progress'}, function (err,docs)
                  {
                    if(docs.length>0)
                    {
                      db.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'undeploy',status:'success'});
                      dbLog.insert({hotfixNumber:docs[0]['hotfixNumber'], hotfixname : hotfx, Updated_On: startTime, process:'undeploy',status:'success'});
                      db.remove ({hotfixname: hotfx,process:'undeploy',status:'in progress'}, {});
                      db.remove ({hotfixname: hotfx,process:'deploy',status:'success'}, {});
                    }
                  }); 
               startServices();
            }
        });
        });
    }
//unzipps a zip file zipFile to the directory whereToUnzip
 var unzipp=function(zipFile, whereToUnzip)
  { 
    var zip = new AdmZip(zipFile);
    var zipEntries = zip.getEntries();
    zip.extractAllTo( whereToUnzip, true);
  }

 //function to scan for all Class files that have been unzipped
   var scanforUnZipClassfiles=function(resolve_scanforUnZipClassfiles, reject_scanforUnZipClassfiles){
     scan(UnzipDirectory,'.class',function(err, files) 
       {
         // Do something with files that ends in '.class'.
         var folderName;
         for(var i=UnzipDirectory.length-1;i>=0;i--)
           {
             if(UnzipDirectory[i]=='/')
              {
                folderName=UnzipDirectory.substring(i+1,UnzipDirectory.length);
              }
           }
          if(files.length>0 )
            {
              if(!fs.existsSync(Backup))
               {
                 mkdirSync(Backup);
               }
              else
                console.log('......Directory '+Backup+' already Exists');
            }
         var jartozipArr= new Array;
         var jartozip;
         var object = new Promise(function(resolve_Unjar, reject_Unjar) 
            {
              for (var x=0;x<files.length;x++)
                {
                  var fileCurrent=files[x];
                  var fileCurrentTemp=files[x];
                  var whichClassToReplace='com';
                  var appropriateJar;
                  var UnzippedJar;
                  var result=fileCurrent.split('/');
                  for(var j=0;j<result.length;j++)
                     {
                        if(result[j].indexOf('.jar')>-1)
                          { 
                            appropriateJar=result[j];
                            jartozip=appropriateJar.substring(0,result[j].length-4);
                            if(jartozipArr.indexOf(jartozip)==-1)
                            jartozipArr.push(jartozip);
                            if (!fs.existsSync(csawar_lib+'/'+jartozip)) 
                               {
                                 var zipFile=csawar_lib+'/'+appropriateJar;
                                 var whereToUnzip=csawar_lib+'/'+jartozip;
                                 console.log('......Unzipping jar and creating folder '+jartozip);
                                 var zip = new AdmZip(zipFile);
                                 //console.log('......Class BackUp Directory banane jaa rhe');
                                 var zipEntries = zip.getEntries();
                                 zip.extractAllTo( whereToUnzip, true);
                                 UnzippedJar=csawar_lib+'/'+jartozip;
                                //console.log('......Class BackUp Directory banane jaa rhe'+UnzippedJar);
                                break; 
                              }
                          }
                       }
                 for(var j=fileCurrent.length;j>0;j--)
                    {
                       if(fileCurrent[j]=='/')
                          {
                             classFile=fileCurrent.substring(j,fileCurrent.length-6);
                             break; 
                          }
                    }
                 var dir=Backup;
                 dir=dir+'/'+folderName;
                 if (!fs.existsSync(dir)) 
                     {
                       mkdirSync(dir);
                     }
                 for(var j=0;j<result.length;j++)
                     {
                       if(j>result.indexOf('com'))
                         { 
                           whichClassToReplace+='/'+result[j];
                         }
                     }
                UnzippedJar=csawar_lib+'/'+jartozip+'/'+whichClassToReplace;
                fs.writeFileSync(dir+'/'+jartozip+'.jar', fs.readFileSync(csawar_lib+'/'+jartozip+'.jar'));
                replaceWithChangedClasses(UnzippedJar, fileCurrentTemp,resolve_Unjar,reject_Unjar);
            } 
        });
        object.then(function(e) 
           {
              console.log('......now zip back');
              if (fs.existsSync(csawar_lib+'/'+jartozip)) 
                { 
                  var promiseA = new Promise(function(resolve, reject) 
                      {      
                        ZipBack(csawar_lib,jartozip,resolve,reject); //taking too long ******* 
                       
                      });
                   promiseA.then(function(e) 
                    { 
                      
                      console.log('......done ZipBack'); 
                      if(fs.existsSync(csawar_lib+'/'+jartozip))
                        { 
                          for(var x=0;x<jartozipArr.length;x++)
                          {
                            var path=csawar_lib+'/'+jartozipArr[x];
                            //console.log('deleting the unzipped folder'+csawar_lib+'/'+jartozipArr[x]);
                            if(fs.existsSync(path))
                             deleteFolderRecursive(path);
                         }
                        }
                        resolve_scanforUnZipClassfiles();
                    }).catch(function(e) 
                     { 

                       console.log('......catch : zipBack not successful'+e);
                       reject_scanforUnZipClassfiles();
                    }); 
                 }
              })
         object.catch(function(e)
          { 
            console.log('......catch : check in function replaceWithChangedClasses '+e);
            reject_scanforUnZipClassfiles();
             
          });
        });
      }
//deletes All the contents of a directory and finally the directory itself
  var deleteFolderRecursive = function(path) 
  {
   if( fs.existsSync(path) ) 
   {
      fs.readdirSync(path).forEach(function(file) {
        var curPath = path + "/" + file;
          if(fs.statSync(curPath).isDirectory()) { // recurse
              deleteFolderRecursive(curPath);
          } else { // delete file
              fs.unlinkSync(curPath);
          }
      });
      fs.rmdirSync(path);
    }
 };
//zipBack the modified folder
var ZipBack=function(csawar_lib1,jartozip,resolve,reject)
  {
    console.log('......inside zipBack method ');
    zipFolder(csawar_lib1+'/'+jartozip, csawar_lib1+'/'+jartozip+'.zip', function(err) {
    if(err) 
     {
       console.log('......oh no!', err);
     } 
    else 
     { 
       console.log('......inside zipBack method else condition');
       var zipToJar=csawar_lib1+'/'+jartozip;
       if (fs.existsSync(csawar_lib1+'/'+jartozip+'.zip'))
         {
           fs.rename(zipToJar+'.zip', zipToJar+'.jar', function (err) 
             {
               if(err!=null) 
               console.log('......rename callback ', err); 
               else
               {
                 console.log('......returning true ');
                 resolve();
               }
            });
         }  
      } 
       console.log('......EXCELLENT');
     });
   }

var replaceWithChangedClasses=function(replacethisfile, withthisfile,resolve,reject)
  {
      if(fs.existsSync(replacethisfile)&& fs.existsSync(withthisfile))
      {
        fs.unlinkSync(replacethisfile);
        fs.writeFileSync(replacethisfile, fs.readFileSync(withthisfile));
        resolve();
      }
      else
        reject();
  }
//scans through the unzipped files and directories for another zip file to further unzip it
var scan = function(dir, suffix, callback)
 {
  fs.readdir(dir, function(err, files) {
    var returnFiles = [];
    async.each(files, function(file, next) {
      var filePath = dir + '/' + file;
      fs.stat(filePath, function(err, stat) {
        if (err) {
          return next(err);
        }
        if (stat.isDirectory()) {
          scan(filePath, suffix, function(err, results) {
            if (err) {
              return next(err);
            }
            returnFiles = returnFiles.concat(results);
            next();
          })
        }
        else if (stat.isFile()) {
          if (file.indexOf(suffix, file.length - suffix.length) !== -1) {
            returnFiles.push(filePath);
          }
          next();
        }
      });
    }, function(err) {
      callback(err, returnFiles);
    });
  });
}
// This method shall unzipp the hotfix zip file and proceed for deployment 
var unzipAndDeployHotfix= function(zipFile,resolve_Promise_unzipAndDeployHotfix,reject_Promise_unzipAndDeployHotfix)
 { 
  for(var j=0;j<zipFile.length;j++)
    {
      if(zipFile[j]=='/')
       { 
         UnzipDirectory=zipFile.substring(j+1,zipFile.length-4);
         break;
       }
     }
    UnzipDirectory='../'+UnzipDirectory;
    mkdirSync(UnzipDirectory);
    var object = new Promise(function(resolve_unZipper, reject_unZipper)
     {
       unzipper(zipFile,UnzipDirectory,resolve_unZipper,reject_unZipper);
     });
      object.then(function(e) 
         {
             console.log('......resolved unzipAndDeployHotfix');
             resolve_Promise_unzipAndDeployHotfix();
         }).catch(function(e) 
         { 
            console.log('......catch :unzipper went wrong');
            reject_Promise_unzipAndDeployHotfix();
         });
    } 
  //function that unzips the hotfix.zip file 
  var unzipper=function(zipFile, whereToUnzip,resolve_unZipper,reject_unZipper)
  { 
    var zip = new AdmZip(zipFile);
    var zipEntries = zip.getEntries();
    zip.extractAllTo( whereToUnzip, true);
    var object = new Promise(function(resolvedeployDifferentFiles, rejectdeployDifferentFiles)
       {
          deployDifferentFiles(resolvedeployDifferentFiles, rejectdeployDifferentFiles); //call the function and start actual deployement
       });
   object.then(function(e) 
          {
            console.log('......resolved unZipper');
            resolve_unZipper(); //resolve the promise passed to this function
          }).catch(function(e) 
          {
            reject_unZipper();////resolve the promise passed to this function
            console.log('......catch :Sorry Deployment went wrong! check unzipper method ');
          });
   }
  //This method calls the functions for deployement
  var deployDifferentFiles=function(resolvedeployDifferentFiles, rejectdeployDifferentFiles)
    { 
      
           //scan for jar files in the hotfix
            scan(UnzipDirectory,'.jar',function(err, files) 
            {
            if(files.length>0)
              {
                var object = new Promise(function(resolve, reject)
                  {
                      scanforUnZipjarfiles(resolve, reject);
                    
                  });
                object.then(function(e)
                 {
                    console.log('......jar files deployed');
                    resolvedeployDifferentFiles();
                 }).catch(function(e) 
                 { 
                    console.log('......catch : jar files deployment went wrong ');
                    rejectdeployDifferentFiles();
                 });
               } 
            else
             {
                console.log('......no jars found');
             }
           });
           //scan for .class files
           scan(UnzipDirectory,'.class',function(err, files) 
            {
              if(files.length>0)
                {
                  var object = new Promise(function(resolve_scanforUnZipClassfiles, reject_scanforUnZipClassfiles)
                    {
                      scanforUnZipClassfiles(resolve_scanforUnZipClassfiles, reject_scanforUnZipClassfiles);
                    });
                  object.then(function(e) 
                    {
                      console.log('......class files deployed');
                      resolvedeployDifferentFiles();
                    }).catch(function(e)
                     { 
                       console.log('......catch : class files deployment went wrong ');
                       rejectdeployDifferentFiles();
                     });
                 }
            else
              { 
                console.log('......no classes found');
              }
          });
          //scan for javascript files
          scan(UnzipDirectory,'.js',function(err, files) 
            {
              if(files.length>0)
                {
                  scanforMppjsfiles(UnzipDirectory, resolvedeployDifferentFiles, rejectdeployDifferentFiles);          
                }
              else
               {
                console.log('......no mpp javascript files found');
               }
           });
    }
    //stop csa service
  function stopServices(Right, wrong)
    {
      var execute = require('child_process').exec;
      if(process.platform=='win32')
        {
          console.log('......Preparing to stop the services. This will take few seconds\n');
          execute('net stop csa', function (error, stdout, stderr) 
          {
            console.log('......Stopping CSA Service');
            if (error !== null) 
              {
                console.log('......CSA service was already stopped ');
                wrong();
              }
           else
             {
              console.log('......CSA Service stopped');
              execute('net stop hpemarketplaceportal.exe', function (error, stdout, stderr) 
                {
                  console.log('......Stopping MPP Service');
                   if (error !== null) 
                     {
                        console.log('......MPP service was already stopped ');
                        wrong();
                    }
                  else
                    {
                      console.log('......MPP Service stopped');
                      execute('net stop hpesearchservice.exe', function (error, stdout, stderr) 
                        {
                          console.log('......Stopping hpe search Service');
                          if (error !== null) 
                            {
                              console.log('......Search service was already stopped ');
                              wrong();
                            }
                          else
                          {
                            console.log('......Hpe Search Service stopped');
                            execute('net stop elasticsearch-service-x64', function (error, stdout, stderr) 
                                  {
                                    console.log('......Stopping elasticsearch Service');
                                      if (error !== null)
                                         {
                                            console.log('......Elastic search service was already stopped');
                                            wrong();
                                          }
                                      else
                                         {
                                          console.log('......elasticsearch Service stopped');
                                          Right();
                                         }
                                  });
                            }
                        });
                    }
                });
              }
            });
         }
      else
        {
          
          execute('service csa stop', function (error, stdout, stderr) 
          {
            if (error !== null) 
              {
                console.log('......CSA service was already stopped ');
                wrong();
              }
             else
            {
              execute('service hpemarketplaceportal.exe stop', function (error, stdout, stderr) 
                {
                   if (error !== null) 
                     {
                        console.log('......MPP service was already stopped ');
                        wrong();
                    }
                  else
                  {
                    execute('service hpesearchservice.exe stop', function (error, stdout, stderr) 
                      {
                         if (error !== null) 
                          {
                            console.log('......search service was already stopped ');
                            wrong();
                          }
                          else
                          {
                            execute('service elasticsearch-service-x64 stop', function (error, stdout, stderr) 
                              {
                                if (error !== null) 
                                  {
                                    console.log('......Elasticsearch service was already stopped ');
                                    wrong();
                                  }
                                else
                                 {
                                   right();
                                 }  
                             });
                          }
                        });
                      }
                });
            }
          });
        }
     }

   //starts the CSA service   
      function startServices()
          {   
              var execute=require('child_process').exec;
              if(process.platform=='win32')
                 {
                     execute('net start csa', function (error, stdout, stderr) 
                        {
                          console.log('......Starting CSA service');
                           if (error !== null)
                            {
                              console.log('......CSA service was already started');
                            }
                           else
                            {
                              console.log('......CSA service Started');
                            }
                        });       
                     execute('net start hpemarketplaceportal.exe', function (error, stdout, stderr) 
                        {
                          console.log('......Starting MPP service');
                          if (error !== null)
                          {
                            console.log('......CSA service was already started');
                          }
                          else
                          {
                            console.log('......MPP service started');
                          }
                       });
                     execute('net start hpesearchservice.exe', function (error, stdout, stderr) 
                       {
                          console.log('......Starting search service');
                          if (error !== null)
                            {
                              console.log('......search service was already started');
                            }
                         else
                            {
                              console.log('......search service started');
                            }
                       });
                    execute('net start elasticsearch-service-x64', function (error, stdout, stderr) 
                        {
                          console.log('......Starting elasticsearch service');
                          if (error !== null)
                            {
                              console.log('......Elastic search service was already started');
                            }
                          else
                              console.log('......elasticsearch service started');
                          });
                    }
                 else
                   {
                     execute('service csa start', function (error, stdout, stderr) 
                       {
                         console.log('......Starting CSA service');
                         if (error !== null)
                          {
                             console.log('......CSA service was already started: ');
                          }
                        else
                         {
                           console.log('......CSA service started');
                         } 
                       });
                    execute('service hpemarketplaceportal.exe start', function (error, stdout, stderr) 
                       {
                         console.log('......Starting MPPservice');
                         if (error !== null)
                           {
                             console.log('......MPP service was already started');
                           }
                         else
                          {
                            console.log('......MPP service started');
                          }
                       });
                    execute('service hpesearchservice.exe start', function (error, stdout, stderr) 
                      {
                        console.log('......starting search service');
                        if (error !== null)
                          { 
                            console.log('......search service was already started');
                          }
                       else
                         {
                           console.log('......search service started');
                         }
                      });
                    execute('service elasticsearch-service-x64 start', function (error, stdout, stderr) 
                       {
                          console.log('......starting elasticsearch service ');
                          if (error !== null)
                            {
                              console.log('......Elasticsearch service was already started');
                            }
                          else
                            console.log('......elasticsearch service started');
                        });
                   }
              }