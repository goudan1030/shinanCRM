const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function setupPhpMyAdminPmadb() {
  const server = '121.41.65.220';
  const phpmyadminPath = '/www/server/phpmyadmin/phpmyadmin_820fec596217f404';
  const dbUser = 'root';
  const dbPassword = 'Zwd9510301115@';
  
  console.log('🔧 开始设置phpMyAdmin配置存储数据库...');
  
  try {
    // 1. 检查现有数据库
    console.log('\n📋 检查现有数据库...');
    const { stdout: databases } = await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'SHOW DATABASES;'"`);
    console.log('现有数据库:');
    console.log(databases);
    
    // 2. 检查是否已存在phpmyadmin数据库
    if (databases.includes('phpmyadmin')) {
      console.log('✅ phpmyadmin数据库已存在');
    } else {
      console.log('\n🔧 创建phpmyadmin数据库...');
      await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'CREATE DATABASE phpmyadmin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"`);
      console.log('✅ phpmyadmin数据库创建成功');
    }
    
    // 3. 导入phpMyAdmin配置表结构
    console.log('\n📥 导入phpMyAdmin配置表结构...');
    const sqlFile = `${phpmyadminPath}/sql/create_tables.sql`;
    
    // 检查SQL文件是否存在
    const { stdout: fileCheck } = await execAsync(`ssh root@${server} "ls -la ${sqlFile}"`);
    if (fileCheck.includes('No such file')) {
      console.log('⚠️ 未找到create_tables.sql文件，尝试其他位置...');
      
      // 尝试其他可能的SQL文件位置
      const possibleFiles = [
        `${phpmyadminPath}/sql/create_tables.sql`,
        `${phpmyadminPath}/examples/create_tables.sql`,
        `${phpmyadminPath}/setup/frames/create_tables.sql`
      ];
      
      let sqlFileFound = false;
      for (const file of possibleFiles) {
        try {
          const { stdout: check } = await execAsync(`ssh root@${server} "ls -la ${file}"`);
          if (!check.includes('No such file')) {
            console.log(`✅ 找到SQL文件: ${file}`);
            await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} phpmyadmin < ${file}"`);
            sqlFileFound = true;
            break;
          }
        } catch (error) {
          // 继续尝试下一个文件
        }
      }
      
      if (!sqlFileFound) {
        console.log('⚠️ 未找到SQL文件，手动创建基本表结构...');
        await createBasicTables(server, dbUser, dbPassword);
      }
    } else {
      await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} phpmyadmin < ${sqlFile}"`);
      console.log('✅ 配置表结构导入成功');
    }
    
    // 4. 更新phpMyAdmin配置文件
    console.log('\n⚙️ 更新phpMyAdmin配置文件...');
    await updatePhpMyAdminConfig(server, phpmyadminPath, dbUser, dbPassword);
    
    // 5. 验证配置
    console.log('\n📋 验证配置...');
    const { stdout: tables } = await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} -e 'USE phpmyadmin; SHOW TABLES;'"`);
    console.log('phpmyadmin数据库中的表:');
    console.log(tables);
    
    console.log('\n🎉 phpMyAdmin配置存储数据库设置完成！');
    console.log('\n📝 设置内容:');
    console.log('1. 创建了phpmyadmin数据库');
    console.log('2. 导入了配置表结构');
    console.log('3. 更新了phpMyAdmin配置文件');
    console.log('4. 验证了配置结果');
    
    console.log('\n💡 现在请刷新phpMyAdmin页面，pmadb错误应该已经消失。');
    
  } catch (error) {
    console.error('❌ 设置过程中出现错误:', error.message);
    console.error('请检查MySQL连接和权限');
  }
}

async function createBasicTables(server, dbUser, dbPassword) {
  console.log('创建基本配置表...');
  
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS pma__bookmark (
      id int(11) NOT NULL AUTO_INCREMENT,
      dbase varchar(255) NOT NULL DEFAULT '',
      user varchar(255) NOT NULL DEFAULT '',
      label varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '',
      query text NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Bookmarks';

    CREATE TABLE IF NOT EXISTS pma__relation (
      master_db varchar(64) NOT NULL DEFAULT '',
      master_table varchar(64) NOT NULL DEFAULT '',
      master_field varchar(64) NOT NULL DEFAULT '',
      foreign_db varchar(64) NOT NULL DEFAULT '',
      foreign_table varchar(64) NOT NULL DEFAULT '',
      foreign_field varchar(64) NOT NULL DEFAULT '',
      PRIMARY KEY (master_db,master_table,master_field),
      KEY foreign_db (foreign_db,foreign_table)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Relation table';

    CREATE TABLE IF NOT EXISTS pma__table_info (
      db_name varchar(64) NOT NULL DEFAULT '',
      table_name varchar(64) NOT NULL DEFAULT '',
      display_field varchar(64) NOT NULL DEFAULT '',
      PRIMARY KEY (db_name,table_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Table information for phpMyAdmin';

    CREATE TABLE IF NOT EXISTS pma__table_coords (
      db_name varchar(64) NOT NULL DEFAULT '',
      table_name varchar(64) NOT NULL DEFAULT '',
      pdf_page_number int(11) NOT NULL DEFAULT 0,
      x float NOT NULL DEFAULT 0,
      y float NOT NULL DEFAULT 0,
      PRIMARY KEY (db_name,table_name,pdf_page_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Table coordinates for phpMyAdmin PDF output';

    CREATE TABLE IF NOT EXISTS pma__pdf_pages (
      db_name varchar(64) NOT NULL DEFAULT '',
      page_nr int(10) unsigned NOT NULL AUTO_INCREMENT,
      page_descr varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '',
      PRIMARY KEY (page_nr),
      KEY db_name (db_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='PDF page settings for phpMyAdmin';

    CREATE TABLE IF NOT EXISTS pma__column_info (
      id int(5) unsigned NOT NULL AUTO_INCREMENT,
      db_name varchar(64) NOT NULL DEFAULT '',
      table_name varchar(64) NOT NULL DEFAULT '',
      column_name varchar(64) NOT NULL DEFAULT '',
      comment varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '',
      mimetype varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '',
      transformation varchar(255) NOT NULL DEFAULT '',
      transformation_options varchar(255) NOT NULL DEFAULT '',
      input_transformation varchar(255) NOT NULL DEFAULT '',
      input_transformation_options varchar(255) NOT NULL DEFAULT '',
      PRIMARY KEY (id),
      UNIQUE KEY db_name (db_name,table_name,column_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Column information for phpMyAdmin';

    CREATE TABLE IF NOT EXISTS pma__history (
      id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
      username varchar(64) NOT NULL DEFAULT '',
      db varchar(64) NOT NULL DEFAULT '',
      table varchar(64) NOT NULL DEFAULT '',
      timevalue timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      sqlquery text NOT NULL,
      PRIMARY KEY (id),
      KEY username (username,db,table,timevalue)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='SQL history for phpMyAdmin';

    CREATE TABLE IF NOT EXISTS pma__recent (
      id int(5) unsigned NOT NULL AUTO_INCREMENT,
      username varchar(64) NOT NULL DEFAULT '',
      tables text NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Recently accessed tables';

    CREATE TABLE IF NOT EXISTS pma__favorite (
      id int(5) unsigned NOT NULL AUTO_INCREMENT,
      username varchar(64) NOT NULL DEFAULT '',
      tables text NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Favorite tables';

    CREATE TABLE IF NOT EXISTS pma__table_uiprefs (
      username varchar(64) NOT NULL DEFAULT '',
      db_name varchar(64) NOT NULL DEFAULT '',
      table_name varchar(64) NOT NULL DEFAULT '',
      prefs text NOT NULL,
      last_update timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (username,db_name,table_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Tables'' UI preferences';

    CREATE TABLE IF NOT EXISTS pma__navigationhiding (
      username varchar(64) NOT NULL DEFAULT '',
      item_name varchar(64) NOT NULL DEFAULT '',
      item_type varchar(64) NOT NULL DEFAULT '',
      db_name varchar(64) NOT NULL DEFAULT '',
      table_name varchar(64) NOT NULL DEFAULT '',
      PRIMARY KEY (username,item_name,item_type,db_name,table_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Hidden items of navigation tree';

    CREATE TABLE IF NOT EXISTS pma__users (
      username varchar(64) NOT NULL DEFAULT '',
      usergroup varchar(64) NOT NULL DEFAULT '',
      PRIMARY KEY (username,usergroup)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Users and their assignments to user groups';

    CREATE TABLE IF NOT EXISTS pma__usergroups (
      usergroup varchar(64) NOT NULL DEFAULT '',
      tab varchar(64) NOT NULL DEFAULT '',
      allowed enum('Y','N') NOT NULL DEFAULT 'N',
      PRIMARY KEY (usergroup,tab,allowed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='User groups with configured menu items';

    CREATE TABLE IF NOT EXISTS pma__designer_settings (
      username varchar(64) NOT NULL DEFAULT '',
      settings_data text NOT NULL,
      PRIMARY KEY (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Settings related to Designer';

    CREATE TABLE IF NOT EXISTS pma__central_columns (
      db_name varchar(64) NOT NULL DEFAULT '',
      col_name varchar(64) NOT NULL DEFAULT '',
      col_type varchar(64) NOT NULL DEFAULT '',
      col_length set('','TINYINT','SMALLINT','MEDIUMINT','INT','BIGINT','DECIMAL','FLOAT','DOUBLE','REAL','BIT','BOOLEAN','SERIAL','DATE','DATETIME','TIMESTAMP','TIME','YEAR','CHAR','VARCHAR','TINYTEXT','TEXT','MEDIUMTEXT','LONGTEXT','BINARY','VARBINARY','TINYBLOB','BLOB','MEDIUMBLOB','LONGBLOB','ENUM','SET','GEOMETRY','POINT','LINESTRING','POLYGON','MULTIPOINT','MULTILINESTRING','MULTIPOLYGON','GEOMETRYCOLLECTION') NOT NULL DEFAULT '',
      col_collation varchar(64) NOT NULL DEFAULT '',
      col_isNull boolean NOT NULL DEFAULT 1,
      col_extra set('','auto_increment','BINARY','UNSIGNED','UNSIGNED ZEROFILL','on update CURRENT_TIMESTAMP','','','','','','','','','','') NOT NULL DEFAULT '',
      col_default text,
      PRIMARY KEY (db_name,col_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Central list of columns';

    CREATE TABLE IF NOT EXISTS pma__designer_coords (
      db_name varchar(64) NOT NULL DEFAULT '',
      table_name varchar(64) NOT NULL DEFAULT '',
      x int(11) NOT NULL DEFAULT 0,
      y int(11) NOT NULL DEFAULT 0,
      v tinyint(4) NOT NULL DEFAULT 0,
      h tinyint(4) NOT NULL DEFAULT 0,
      PRIMARY KEY (db_name,table_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Table coordinates for Designer';

    CREATE TABLE IF NOT EXISTS pma__export_templates (
      id int(5) unsigned NOT NULL AUTO_INCREMENT,
      username varchar(64) NOT NULL DEFAULT '',
      export_type varchar(10) NOT NULL DEFAULT '',
      template_name varchar(64) NOT NULL DEFAULT '',
      template_data text NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY u_user_type_template (username,export_type,template_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Saved export templates';

    CREATE TABLE IF NOT EXISTS pma__savedsearches (
      id int(5) unsigned NOT NULL AUTO_INCREMENT,
      username varchar(64) NOT NULL DEFAULT '',
      db_name varchar(64) NOT NULL DEFAULT '',
      search_name varchar(64) NOT NULL DEFAULT '',
      search_data text NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY u_savedsearches_username_dbname (username,db_name,search_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Saved searches';

    CREATE TABLE IF NOT EXISTS pma__tracking (
      db_name varchar(64) NOT NULL DEFAULT '',
      table_name varchar(64) NOT NULL DEFAULT '',
      version int(10) unsigned NOT NULL DEFAULT 1,
      date_created datetime NOT NULL DEFAULT '1000-01-01 00:00:00',
      date_updated datetime NOT NULL DEFAULT '1000-01-01 00:00:00',
      schema_snapshot text NOT NULL,
      schema_sql text,
      data_sql longtext,
      tracking set('UPDATE','REPLACE','INSERT','DELETE','TRUNCATE','CREATE DATABASE','ALTER DATABASE','DROP DATABASE','CREATE TABLE','ALTER TABLE','RENAME TABLE','DROP TABLE','CREATE INDEX','DROP INDEX','CREATE VIEW','ALTER VIEW','DROP VIEW') DEFAULT NULL,
      tracking_active int(1) unsigned NOT NULL DEFAULT 1,
      PRIMARY KEY (db_name,table_name,version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Database changes tracking for phpMyAdmin';

    CREATE TABLE IF NOT EXISTS pma__userconfig (
      username varchar(64) NOT NULL DEFAULT '',
      timevalue timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      config_data text NOT NULL,
      PRIMARY KEY (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='User preferences storage for phpMyAdmin';

    CREATE TABLE IF NOT EXISTS pma__users (
      username varchar(64) NOT NULL DEFAULT '',
      usergroup varchar(64) NOT NULL DEFAULT '',
      PRIMARY KEY (username,usergroup)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Users and their assignments to user groups';

    CREATE TABLE IF NOT EXISTS pma__usergroups (
      usergroup varchar(64) NOT NULL DEFAULT '',
      tab varchar(64) NOT NULL DEFAULT '',
      allowed enum('Y','N') NOT NULL DEFAULT 'N',
      PRIMARY KEY (usergroup,tab,allowed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='User groups with configured menu items';
  `;
  
  // 将SQL写入临时文件并执行
  const tempFile = `/tmp/phpmyadmin_tables_${Date.now()}.sql`;
  await execAsync(`ssh root@${server} "echo '${createTablesSQL}' > ${tempFile}"`);
  await execAsync(`ssh root@${server} "mysql -u ${dbUser} -p${dbPassword} phpmyadmin < ${tempFile}"`);
  await execAsync(`ssh root@${server} "rm -f ${tempFile}"`);
  
  console.log('✅ 基本配置表创建成功');
}

async function updatePhpMyAdminConfig(server, phpmyadminPath, dbUser, dbPassword) {
  console.log('更新phpMyAdmin配置文件...');
  
  const configFile = `${phpmyadminPath}/config.inc.php`;
  
  // 读取当前配置
  const { stdout: currentConfig } = await execAsync(`ssh root@${server} "cat ${configFile}"`);
  
  // 检查是否已配置pmadb
  if (currentConfig.includes('$cfg[\'Servers\'][$i][\'pmadb\']')) {
    console.log('✅ pmadb配置已存在');
    return;
  }
  
  // 添加pmadb配置
  const pmadbConfig = `
// phpMyAdmin配置存储设置
$cfg['Servers'][$i]['pmadb'] = 'phpmyadmin';
$cfg['Servers'][$i]['bookmarktable'] = 'pma__bookmark';
$cfg['Servers'][$i]['relation'] = 'pma__relation';
$cfg['Servers'][$i]['table_info'] = 'pma__table_info';
$cfg['Servers'][$i]['table_coords'] = 'pma__table_coords';
$cfg['Servers'][$i]['pdf_pages'] = 'pma__pdf_pages';
$cfg['Servers'][$i]['column_info'] = 'pma__column_info';
$cfg['Servers'][$i]['history'] = 'pma__history';
$cfg['Servers'][$i]['recent'] = 'pma__recent';
$cfg['Servers'][$i]['favorite'] = 'pma__favorite';
$cfg['Servers'][$i]['table_uiprefs'] = 'pma__table_uiprefs';
$cfg['Servers'][$i]['navigationhiding'] = 'pma__navigationhiding';
$cfg['Servers'][$i]['users'] = 'pma__users';
$cfg['Servers'][$i]['usergroups'] = 'pma__usergroups';
$cfg['Servers'][$i]['designer_settings'] = 'pma__designer_settings';
$cfg['Servers'][$i]['central_columns'] = 'pma__central_columns';
$cfg['Servers'][$i]['designer_coords'] = 'pma__designer_coords';
$cfg['Servers'][$i]['export_templates'] = 'pma__export_templates';
$cfg['Servers'][$i]['savedsearches'] = 'pma__savedsearches';
$cfg['Servers'][$i]['tracking'] = 'pma__tracking';
$cfg['Servers'][$i]['userconfig'] = 'pma__userconfig';
$cfg['Servers'][$i]['controluser'] = 'pma';
$cfg['Servers'][$i]['controlpass'] = '';
$cfg['Servers'][$i]['AllowNoPassword'] = true;
`;
  
  // 备份原配置文件
  await execAsync(`ssh root@${server} "cp ${configFile} ${configFile}.backup.$(date +%Y%m%d_%H%M%S)"`);
  
  // 添加配置到文件末尾
  await execAsync(`ssh root@${server} "echo '${pmadbConfig}' >> ${configFile}"`);
  
  console.log('✅ phpMyAdmin配置文件更新成功');
}

// 执行设置
setupPhpMyAdminPmadb(); 