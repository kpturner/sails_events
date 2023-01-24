ALTER TABLE `event`
  ADD COLUMN `regReqd` tinyint(1) DEFAULT NULL;
ALTER TABLE `booking`
  ADD COLUMN `carReg` varchar(255) DEFAULT NULL;
ALTER TABLE `linkedBooking`
  ADD COLUMN `carReg` varchar(255) DEFAULT NULL;
