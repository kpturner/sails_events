ALTER TABLE `linkedbooking`
  ADD COLUMN `carReg` varchar(255) DEFAULT NULL;
ALTER TABLE `event`
  ADD COLUMN `regReqd` tinyint(1) DEFAULT NULL;
ALTER TABLE `booking`
  ADD COLUMN `carReg` varchar(255) DEFAULT NULL;

ALTER TABLE `event`
  ADD COLUMN `menu5` longtext AFTER `menu4`
    ADD COLUMN `menu6` longtext AFTER `menu5`
    ADD COLUMN `menu7` longtext AFTER `menu6`
    ADD COLUMN `menu8` longtext AFTER `menu7`
    ADD COLUMN `menu9` longtext AFTER `menu8`
    ADD COLUMN `menu10` longtext AFTER `menu9`
    ADD COLUMN `allowAttendingOnly` tinyint(1) DEFAULT NULL AFTER `regInterest`
    ;

ALTER TABLE `booking`
    ADD COLUMN `attendingOnly` tinyint(1) DEFAULT NULL AFTER `ref`
    ;