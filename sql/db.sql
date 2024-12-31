# ************************************************************
# Sequel Pro SQL dump
# Version 4541
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: events.hamtun7083.org (MySQL 5.5.5-10.6.7-MariaDB-2ubuntu1.1)
# Database: squareevents_hamtun
# Generation Time: 2022-10-17 18:42:39 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table apology
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `apology` (
  `event` int(11) DEFAULT NULL,
  `user` int(11) DEFAULT NULL,
  `message` longtext DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;



# Dump of table booking
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `booking` (
  `user` int(11) DEFAULT NULL,
  `event` int(11) DEFAULT NULL,
  `menuChoice` int(11) DEFAULT NULL,
  `ref` varchar(255) DEFAULT NULL,
  `attendingOnly` tinyint(1) DEFAULT NULL
  `dietary` varchar(255) DEFAULT NULL,
  `places` int(11) DEFAULT NULL,
  `cost` float DEFAULT NULL,
  `amountPaid` float DEFAULT NULL,
  `paid` tinyint(1) DEFAULT NULL,
  `mop` varchar(255) DEFAULT NULL,
  `info` longtext DEFAULT NULL,
  `bookingDate` date DEFAULT NULL,
  `lastPaymentReminder` date DEFAULT NULL,
  `carReg` varchar(255) DEFAULT NULL,
  `remindersSent` int(11) DEFAULT NULL,
  `tableNo` int(11) DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `paymentSessionId` varchar(255) DEFAULT NULL,
  `paymentReference` longtext DEFAULT NULL,
  `refundReference` longtext DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `booking_payment_session` (`paymentSessionId`),
  KEY `booking_user` (`user`),
  KEY `booking_event` (`event`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;



# Dump of table event
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `event` (
  `name` varchar(255) DEFAULT NULL,
  `organiser` int(11) DEFAULT NULL,
  `organiser2` int(11) DEFAULT NULL,
  `dc` int(11) DEFAULT NULL,
  `order` varchar(255) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `logoRight` varchar(255) DEFAULT NULL,
  `additionalInfo` varchar(255) DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `blurb` longtext DEFAULT NULL,
  `menusOnOffer` int(11) DEFAULT NULL,
  `menu` longtext DEFAULT NULL,
  `menu2` longtext DEFAULT NULL,
  `menu3` longtext DEFAULT NULL,
  `menu4` longtext DEFAULT NULL,
  `menu5` longtext DEFAULT NULL,
  `menu6` longtext DEFAULT NULL,
  `menu7` longtext DEFAULT NULL,
  `menu8` longtext DEFAULT NULL,
  `menu9` longtext DEFAULT NULL,
  `menu10` longtext DEFAULT NULL,
  `dressCode` varchar(255) DEFAULT NULL,
  `capacity` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `time` varchar(255) DEFAULT NULL,
  `openingDate` date DEFAULT NULL,
  `openingTime` varchar(255) DEFAULT NULL,
  `closingDate` date DEFAULT NULL,
  `open` tinyint(1) DEFAULT NULL,
  `hide` tinyint(1) DEFAULT NULL,
  `addressReqd` tinyint(1) DEFAULT NULL,
  `regReqd` tinyint(1) DEFAULT NULL,
  `areaReqd` tinyint(1) DEFAULT NULL,
  `free` tinyint(1) DEFAULT NULL,
  `regInterest` tinyint(1) DEFAULT NULL,
  `allowAttendingOnly` tinyint(1) DEFAULT NULL
  `voReqd` tinyint(1) DEFAULT NULL,
  `price` float DEFAULT NULL,
  `minBookingPlaces` int(11) DEFAULT NULL,
  `maxBookingPlaces` int(11) DEFAULT NULL,
  `paymentDetails` longtext DEFAULT NULL,
  `grace` int(11) DEFAULT NULL,
  `showApologyButton` tinyint(1) DEFAULT NULL,
  `bypassCode` varchar(255) DEFAULT NULL,
  `latePaymentChecking` tinyint(1) DEFAULT NULL,
  `eventNameSize` varchar(255) DEFAULT NULL,
  `lastBookingRef` int(11) DEFAULT NULL,
  `onlinePayments` tinyint(1) DEFAULT NULL,
  `onlinePaymentPlatform` varchar(255) DEFAULT NULL,
  `onlinePaymentConfig` varchar(255) DEFAULT NULL,
  `recoverOnlinePaymentFee` tinyint(1) DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;



# Dump of table linkedbooking
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `linkedbooking` (
  `booking` int(11) DEFAULT NULL,
  `seq` int(11) DEFAULT NULL,
  `salutation` varchar(255) DEFAULT NULL,
  `surname` varchar(255) DEFAULT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lodge` varchar(255) DEFAULT NULL,
  `lodgeNo` varchar(255) DEFAULT NULL,
  `lodgeYear` varchar(255) DEFAULT NULL,
  `centre` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `rank` varchar(255) DEFAULT NULL,
  `dietary` varchar(255) DEFAULT NULL,
  `carReg` varchar(255) DEFAULT NULL,
  `menuChoice` int(11) DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `linkedbooking_booking` (`booking`,`seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;



# Dump of table lodgeroom
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `lodgeroom` (
  `event` int(11) DEFAULT NULL,
  `booking` int(11) DEFAULT NULL,
  `salutation` varchar(255) DEFAULT NULL,
  `surname` varchar(255) DEFAULT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `rank` varchar(255) DEFAULT NULL,
  `cancelled` tinyint(1) DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lodgeroom_key` (`event`,`booking`),
  KEY `lodgeroom_booking` (`booking`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;



# Dump of table order
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `order` (
  `user` int(11) DEFAULT NULL,
  `code` varchar(255) DEFAULT NULL,
  `salutation` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `number` varchar(255) DEFAULT NULL,
  `year` varchar(255) DEFAULT NULL,
  `centre` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `rank` varchar(255) DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_user` (`user`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;



# Dump of table passport
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `passport` (
  `protocol` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `accessToken` varchar(255) DEFAULT NULL,
  `provider` varchar(255) DEFAULT NULL,
  `identifier` varchar(255) DEFAULT NULL,
  `tokens` longtext DEFAULT NULL,
  `user` int(11) DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;



# Dump of table token
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `token` (
  `token` varchar(255) NOT NULL,
  `user` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;



# Dump of table user
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user` (
  `username` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `salutation` varchar(255) DEFAULT NULL,
  `surname` varchar(255) DEFAULT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lodge` varchar(255) DEFAULT NULL,
  `lodgeNo` varchar(255) DEFAULT NULL,
  `lodgeYear` varchar(255) DEFAULT NULL,
  `centre` varchar(255) DEFAULT NULL,
  `area` varchar(255) DEFAULT NULL,
  `rank` varchar(255) DEFAULT NULL,
  `address1` varchar(255) DEFAULT NULL,
  `address2` varchar(255) DEFAULT NULL,
  `address3` varchar(255) DEFAULT NULL,
  `address4` varchar(255) DEFAULT NULL,
  `postcode` varchar(255) DEFAULT NULL,
  `dietary` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `isAdmin` tinyint(1) DEFAULT NULL,
  `isOrganiser` tinyint(1) DEFAULT NULL,
  `isDC` tinyint(1) DEFAULT NULL,
  `isPD` tinyint(1) DEFAULT NULL,
  `isVO` tinyint(1) DEFAULT NULL,
  `voLodge` varchar(255) DEFAULT NULL,
  `voLodgeNo` varchar(255) DEFAULT NULL,
  `voCentre` varchar(255) DEFAULT NULL,
  `voArea` varchar(255) DEFAULT NULL,
  `authProvider` varchar(255) DEFAULT NULL,
  `lastLoggedIn` datetime DEFAULT NULL,
  `useGravatar` tinyint(1) DEFAULT NULL,
  `gravatarUrl` varchar(255) DEFAULT NULL,
  `spamAck` tinyint(1) DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
