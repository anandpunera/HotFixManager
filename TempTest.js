 //stop csa service
 var services=['csa','hpemarketplaceportal.exe','hpesearchservice.exe','elasticsearch-service-x64'];
  function stopServices(Right, wrong)
    {
      var execute = require('child_process').exec;
      services.forEach(function(service)
      {
        execute('net stop '+service, function (error, stdout, stderr) 
          { 
            console.log('......Stopping  '+service+ '  Service');
            if (error !== null) 
              {
                console.log('......'+service+' service was already stopped ');
                wrong();
              }
            if(i==3)
            {
              Right();
            }
          });
      });
    }
    var wrong=function(){
      console.log(" \n Wrong \n ");
    }
    var Right=function(){
      console.log(" \n Right \n ");
    }
    startServices();
    //stopServices(wrong, Right);
     /* if(process.platform=='win32')
        {
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
*/
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

      
       



    

